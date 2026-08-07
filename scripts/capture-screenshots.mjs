#!/usr/bin/env node
/**
 * capture-screenshots.mjs — visual proof for the Enterprise Ops Monitor demo.
 *
 * Boots the demo stack (mock-api + Vite web app), drives a real headless
 * Chromium through every surface, and saves one viewport screenshot per page
 * into docs/screenshots/, plus an animated GIF walkthrough.
 *
 * Usage:
 *   node scripts/capture-screenshots.mjs
 *   pnpm screenshots
 *
 * Approach notes (read before editing):
 *
 * 1. Child processes. The mock API (`node mock-api/server.js`, port 4000) and
 *    the web app (`node scripts/start-web-e2e.mjs`, port 5182, VITE_APP_MODE
 *    = demo) are spawned as children of this script and killed on exit via
 *    SIGINT/SIGTERM/exit handlers.
 *
 * 2. Leftover cleanup — re-running must not hit EADDRINUSE. Child PIDs are
 *    written to node_modules/.cache/capture-screenshots.pids.json right after
 *    spawn. On startup the script reads that file and kills any recorded PID
 *    that is still alive (tree-kill on Windows: `taskkill /PID <pid> /T /F`,
 *    so the cmd -> pnpm.cmd -> vite chain dies together). This is the
 *    simplest reliable approach for leftovers of *this* script. Anything else
 *    holding ports 4000/5182 is not ours — the run then fails loudly rather
 *    than killing an unrelated process.
 *
 * 3. Demo session token. The mock API keeps sessions in memory and hands out
 *    a Bearer token with no cookie bridge (ADR-5: token lives in memory only).
 *    A full page reload therefore requires the token in localStorage, exactly
 *    like apps/web/e2e/auth.setup.ts does for the e2e suite. The script does a
 *    REAL UI login on /login, captures the token from the network, plants it in
 *    localStorage (the demo's own recovery path), and only then navigates to
 *    each authed route — every page.goto reloads and restores the session via
 *    /api/auth/me, same as the e2e storageState flow.
 *
 * 4. waitUntil — `networkidle` is attempted first per the brief, but the Vite
 *    dev-server client keeps an open Hot Module Replacement WebSocket, which
 *    can keep networkidle from ever settling. A short bounded timeout then
 *    falls back to `load` + a page-specific anchor + a settle wait (<=500ms),
 *    which is the actual "content rendered" signal.
 *
 * 5. ffmpeg is a system binary (choco install ffmpeg). The webm recorded by
 *    Playwright (VP8/VP9) is converted to a palette GIF with the canonical
 *    two-pass filter run; if the GIF exceeds 5 MB the fps/width are reduced
 *    and the conversion retried. The intermediate webm is deleted.
 *
 * 6. Exit code 0 even when pages warn (console/page errors are collected and
 *    reported loudly at the end — visual capture is the goal). Exit code 1 on
 *    hard failures: stack failed to boot, browser failed, GIF failed.
 */

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/* ─────────────────────────── Configuration ─────────────────────────── */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOCK_URL = 'http://127.0.0.1:4000';
const WEB_URL = 'http://127.0.0.1:5182';
const MOCK_PORT = 4000;
const WEB_PORT = 5182;

const OUT_DIR = path.join(ROOT, 'docs', 'screenshots');
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache');
const PID_FILE = path.join(CACHE_DIR, 'capture-screenshots.pids.json');
const VIDEO_DIR = path.join(CACHE_DIR, 'capture-screenshots-video');

const VIEWPORT = { width: 1440, height: 900 };
const BOOT_TIMEOUT_MS = 120_000; // allow a cold Vite dev boot
const GOTO_TIMEOUT_MS = 20_000; // `networkidle` bound, then fallback to `load`
const ANCHOR_TIMEOUT_MS = 25_000;
const SETTLE_MS = 400; // max settle wait after the page anchor (brief)
const MAX_GIF_BYTES = 5 * 1024 * 1024;

const FFMPEG = [
  process.env.FFMPEG_PATH,
  'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
  'ffmpeg',
].find((candidate) => candidate && existsSync(candidate));
if (!FFMPEG) {
  console.error('[fatal] ffmpeg not found. Install it (choco install ffmpeg) or set FFMPEG_PATH.');
  process.exit(1);
}

/* ───────────────────────────── Logging ─────────────────────────────── */

function log(...args) {
  console.log(`[capture] ${args.join(' ')}`);
}
function warn(...args) {
  console.warn(`[warn] ${args.join(' ')}`);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ─────────────────────── Child process management ──────────────────── */

const children = [];
let pidFileWritten = false;

function readPidFile() {
  try {
    return JSON.parse(readFileSync(PID_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writePidFile() {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(
      PID_FILE,
      JSON.stringify(
        children.map((c) => c.pid),
        null,
        2,
      ),
    );
    pidFileWritten = true;
  } catch (err) {
    warn('could not write pidfile:', err.message);
  }
}

function removePidFile() {
  if (!pidFileWritten) return;
  try {
    rmSync(PID_FILE, { force: true });
  } catch {
    /* ignore */
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Kill a process by PID including its whole tree (vite -> cmd -> pnpm). */
function killTree(pid) {
  if (!pid || !isAlive(pid)) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch {
      /* already gone */
    }
  } else {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* already gone */
      }
    }
  }
}

function killChildren() {
  for (const child of children) {
    if (child.exitCode === null) killTree(child.pid);
  }
  removePidFile();
}

/** Kill leftovers recorded by a previous run of this script. */
function killLeftoversFromPidFile() {
  const leftoverPids = readPidFile();
  if (leftoverPids.length === 0) return;
  log('leftover PIDs from previous run found:', leftoverPids.join(', '));
  for (const pid of leftoverPids) killTree(pid);
}

function forwardOutput(child, label) {
  for (const streamName of ['stdout', 'stderr']) {
    const stream = child[streamName];
    if (!stream) continue;
    const rl = readline.createInterface({ input: stream });
    rl.on('line', (line) => {
      if (process.env.CAPTURE_QUIET) return;
      if (
        line.includes('Local:') ||
        line.includes('ready in') ||
        line.includes('Mock API running')
      ) {
        console.log(`[${label}] ${line}`);
      }
    });
  }
}

function spawnChild(label, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.on('error', (err) => warn(`[${label}] spawn error: ${err.message}`));
  forwardOutput(child, label);
  children.push(child);
  log(`spawned ${label} (pid ${child.pid})`);
  return child;
}

/* ─────────────────────────── Readiness probe ───────────────────────── */

async function waitForHttp(url, timeoutMs, { expectOk = false } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (res.status >= 200 && res.status < 500) {
        if (!expectOk) return true;
        const body = await res.json().catch(() => null);
        if (body?.ok === true) return true;
      }
    } catch {
      /* not up yet; keep polling */
    }
    await sleep(500);
  }
  return false;
}

/* ─────────────────────────── Browser helpers ───────────────────────── */

/**
 * Navigate to a URL and wait for a page-specific anchor to be visible,
 * guaranteeing the surface genuinely rendered before screenshotting.
 */
async function gotoAndWait(page, route, anchor) {
  const url = route.startsWith('/') ? `${WEB_URL}${route}` : route;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: GOTO_TIMEOUT_MS });
  } catch {
    // Vite HMR websocket can keep `networkidle` unsettled — `load` is the
    // real "document ready" signal for this SPA; the anchor wait is the
    // content gate.
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  }
  await page.waitForSelector(anchor, { state: 'visible', timeout: ANCHOR_TIMEOUT_MS });
  await page.waitForTimeout(SETTLE_MS);
}

/** Capture one viewport screenshot after the page anchor is visible. */
async function screenshotSurface(page, surface) {
  const { name, route, anchor } = surface;
  try {
    await gotoAndWait(page, route, anchor);
  } catch (err) {
    warn(`could not load ${name} (${route}) — anchor "${anchor}" not visible (${err.message}).`);
    return { name, ok: false, reason: err.message };
  }
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  log(`captured ${name} -> ${path.relative(ROOT, file)}`);
  return { name, ok: true };
}

/** Attach console + page-error listeners and return a per-page issue setter. */
function watchPageIssues(page) {
  const issues = new Map();
  let current = null;
  const record = (message) => {
    if (!current) return;
    if (!issues.has(current)) issues.set(current, []);
    const list = issues.get(current);
    if (!list.includes(message)) list.push(message);
  };
  page.on('console', (msg) => {
    if (msg.type() === 'error') record(msg.text());
  });
  page.on('pageerror', (err) => record(`pageerror: ${err.message}`));
  return {
    /** Attribute subsequent issues to this page name. */
    attach(pageName) {
      current = pageName;
    },
    /** Non-empty issue lists only, e.g. [['dashboard', ['msg']]]. */
    report() {
      return [...issues.entries()].filter(([, list]) => list.length > 0);
    },
  };
}

/**
 * Real UI login on the demo account: fill the form inputs directly (never the
 * animated quick-login button), submit, wait for the dashboard, and recover
 * the Bearer token from the login response. Plants the token in localStorage
 * so subsequent full page navigations restore the session (demo's own path).
 */
async function demoLogin(page) {
  let authToken = null;
  const onResponse = async (resp) => {
    if (!resp.url().includes('/api/auth/login')) return;
    const body = await resp.json().catch(() => null);
    if (body?.ok && body.data?.token) authToken = body.data.token;
  };
  page.on('response', onResponse);

  await page.goto(`${WEB_URL}/login`, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForSelector('input#username', { state: 'visible', timeout: ANCHOR_TIMEOUT_MS });
  await page.fill('input#username', 'demo');
  await page.fill('input#password', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === '/app', { timeout: 25_000 });
  await page.waitForSelector('[data-e2e="dashboard-kpi-grid"]', {
    state: 'visible',
    timeout: ANCHOR_TIMEOUT_MS,
  });
  page.off('response', onResponse);

  if (!authToken) {
    warn('login succeeded but no Bearer token was captured from the login response.');
    return null;
  }
  // The demo app restores sessions from localStorage (see auth.setup.ts):
  // without this, every full page reload would log us out.
  await page.evaluate((token) => localStorage.setItem('token', token), authToken);
  return authToken;
}

/* ─────────────────────────────── ffmpeg ─────────────────────────────── */

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const stderr = [];
    const child = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.join('').trim()}`));
    });
  });
}

/**
 * Convert a Playwright webm to a palette GIF. Tries progressively cheaper
 * (fps, width) settings until the output fits under MAX_GIF_BYTES.
 */
async function webmToGif(webmPath, gifPath) {
  const attempts = [
    { fps: 10, width: 960 },
    { fps: 8, width: 800 },
    { fps: 6, width: 720 },
    { fps: 5, width: 640 },
  ];
  let lastError = null;
  for (let i = 0; i < attempts.length; i += 1) {
    const { fps, width } = attempts[i];
    const filter =
      `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];` +
      `[s0]palettegen[p];[s1][p]paletteuse`;
    try {
      await runFfmpeg(['-y', '-i', webmPath, '-vf', filter, '-loop', '0', gifPath]);
      const bytes = statSync(gifPath).size;
      if (bytes <= MAX_GIF_BYTES) return { fps, width, bytes };
      log(`gif attempt ${i + 1} (${fps}fps/${width}px) = ${bytes} bytes — retrying smaller`);
      lastError = new Error(`gif too large: ${bytes} > ${MAX_GIF_BYTES}`);
    } catch (err) {
      lastError = err;
      warn(`ffmpeg attempt ${i + 1} (${fps}fps/${width}px) failed: ${err.message}`);
    }
  }
  throw lastError || new Error('gif conversion failed');
}

/* ─────────────────────── The walkthrough GIF tour ───────────────────── */

const TOUR_STOPS = [
  { route: '/app/eod', anchor: 'h1:has-text("EOD Monitor")' },
  { route: '/app/sync', anchor: 'h1:has-text("Store Sync Monitor")' },
  { route: '/app/backups', anchor: 'h1:has-text("Backups Management")' },
  { route: '/app/admin/roles', anchor: 'h1:has-text("Roles")' },
  { route: '/app/admin/afterhours', anchor: 'h1:has-text("Daily Monitor")' },
];

const HOLD_MS = 3000; // dwell on each stop so the walkthrough reads clearly

async function recordWalkthrough(browser) {
  const tourContext = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
  });
  const tourPage = await tourContext.newPage();
  const tourIssues = watchPageIssues(tourPage);
  tourIssues.attach('walkthrough-login');

  // Stop 0: login screen -> real UI login -> dashboard (the live transition
  // is the most interesting part of the walkthrough).
  await tourPage.goto(`${WEB_URL}/login`, { waitUntil: 'load', timeout: 60_000 });
  await tourPage.waitForSelector('input#username', {
    state: 'visible',
    timeout: ANCHOR_TIMEOUT_MS,
  });
  await tourPage.fill('input#username', 'demo');
  await tourPage.fill('input#password', 'demo123');

  let tourToken = null;
  const onResp = async (resp) => {
    if (!resp.url().includes('/api/auth/login')) return;
    const body = await resp.json().catch(() => null);
    if (body?.ok && body.data?.token) tourToken = body.data.token;
  };
  tourPage.on('response', onResp);
  await tourPage.click('button[type="submit"]');
  await tourPage.waitForURL((u) => u.pathname === '/app', { timeout: 25_000 });
  await tourPage.waitForSelector('[data-e2e="dashboard-kpi-grid"]', {
    state: 'visible',
    timeout: ANCHOR_TIMEOUT_MS,
  });
  tourPage.off('response', onResp);
  if (tourToken) {
    await tourPage.evaluate((t) => localStorage.setItem('token', t), tourToken);
  }

  tourIssues.attach('walkthrough-dashboard');
  await tourPage.waitForTimeout(HOLD_MS); // hold on the dashboard

  for (const stop of TOUR_STOPS) {
    tourIssues.attach(`walkthrough-${stop.route}`);
    await gotoAndWait(tourPage, `${WEB_URL}${stop.route}`, stop.anchor);
    await tourPage.waitForTimeout(HOLD_MS);
  }

  // Capture the video reference BEFORE the context closes (page.video() may
  // be unavailable after close), then finalize the recording.
  const video = tourPage.video();
  await tourContext.close();

  let webmPath = null;
  for (let i = 0; i < 50; i += 1) {
    // path() settles once the file exists on disk; webm flush is async.
    try {
      const candidate = await video.path();
      if (candidate && existsSync(candidate)) {
        webmPath = candidate;
        break;
      }
    } catch {
      /* retry */
    }
    await sleep(100);
  }
  if (!webmPath) {
    throw new Error('walkthrough video was not recorded');
  }

  const gifPath = path.join(OUT_DIR, 'walkthrough.gif');
  mkdirSync(OUT_DIR, { recursive: true });
  const result = await webmToGif(webmPath, gifPath);
  log(`walkthrough.gif ready (${result.fps}fps/${result.width}px, ${result.bytes} bytes)`);
  rmSync(webmPath, { force: true });
  log(`deleted intermediate video ${webmPath}`);
  return { gifPath, gifBytes: result.bytes, tourIssues: tourIssues.report() };
}

/* ───────────────────────────────── Main ─────────────────────────────── */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(VIDEO_DIR, { recursive: true });

  // Idempotency: kill leftovers from a previous run of this script.
  killLeftoversFromPidFile();

  // Boot the demo stack.
  spawnChild('mock-api', process.execPath, ['mock-api/server.js'], {
    MOCK_API_PORT: String(MOCK_PORT),
  });
  spawnChild('web', process.execPath, ['scripts/start-web-e2e.mjs'], {
    E2E_WEB_PORT: String(WEB_PORT),
    E2E_API_URL: MOCK_URL,
  });
  writePidFile();

  process.on('SIGINT', () => {
    killChildren();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    killChildren();
    process.exit(143);
  });
  process.on('exit', () => killChildren());

  const mockReady = await waitForHttp(`${MOCK_URL}/api/system/health`, BOOT_TIMEOUT_MS, {
    expectOk: true,
  });
  if (!mockReady) {
    throw new Error(`mock-api never came up (${MOCK_URL}/api/system/health)`);
  }
  log('mock-api is up');

  const webReady = await waitForHttp(`${WEB_URL}/`, BOOT_TIMEOUT_MS);
  if (!webReady) {
    throw new Error(`web app never came up (${WEB_URL})`);
  }
  log(`web app is up on ${WEB_URL}`);

  const browser = await chromium.launch({ headless: true });
  let browserClosed = false;
  const results = [];
  let allIssues = [];

  try {
    // ── 1. Authed screenshots ──
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    const issues = watchPageIssues(page);

    // login surface (before any login attempt)
    issues.attach('login');
    const loginResult = await screenshotSurface(page, {
      name: 'login',
      route: '/login',
      anchor: 'input#username',
    });
    results.push(loginResult);

    // Real UI login — the demo session model needs the token in localStorage
    // to survive full navigations (see file header).
    const authToken = await demoLogin(page);
    if (!authToken) {
      warn(
        'no token captured after UI login — authenticated screenshots will likely redirect to /login',
      );
    }

    const authedSurfaces = [
      { name: 'dashboard', route: '/app', anchor: '[data-e2e="dashboard-kpi-grid"]' },
      { name: 'store-sync', route: '/app/sync', anchor: 'h1:has-text("Store Sync Monitor")' },
      { name: 'eod', route: '/app/eod', anchor: 'h1:has-text("EOD Monitor")' },
      { name: 'stores', route: '/app/stores', anchor: 'h1:has-text("Store Directory")' },
      { name: 'identity', route: '/app/identity', anchor: 'h1:has-text("Employee Directory")' },
      { name: 'backups', route: '/app/backups', anchor: 'h1:has-text("Backups Management")' },
      { name: 'system', route: '/app/system', anchor: 'h1:has-text("System Health")' },
      { name: 'accounts', route: '/app/admin/users', anchor: 'h1:has-text("Accounts")' },
      { name: 'roles', route: '/app/admin/roles', anchor: 'h1:has-text("Roles")' },
      {
        name: 'afterhours',
        route: '/app/admin/afterhours',
        anchor: 'h1:has-text("Daily Monitor")',
      },
      {
        name: 'agent-updater',
        route: '/app/agent-updater',
        anchor: 'h1:has-text("Agent Updater")',
      },
      {
        name: 'office-agents',
        route: '/app/office-agents',
        anchor: 'h1:has-text("Office Agent Monitor")',
      },
    ];
    for (const surface of authedSurfaces) {
      issues.attach(surface.name);
      const result = await screenshotSurface(page, surface);
      results.push(result);
    }

    // ── 2. Unauthenticated /live screenshot (public wallboard) ──
    const liveContext = await browser.newContext({ viewport: VIEWPORT });
    const livePage = await liveContext.newPage();
    const liveIssues = watchPageIssues(livePage);
    liveIssues.attach('live');
    const liveResult = await screenshotSurface(livePage, {
      name: 'live',
      route: '/live',
      anchor: 'h1:has-text("Operational")',
    });
    results.push(liveResult);
    allIssues = [...issues.report(), ...liveIssues.report()];
    await liveContext.close();

    // ── 3. Walkthrough GIF ──
    const gif = await recordWalkthrough(browser);
    allIssues = [...allIssues, ...gif.tourIssues];

    // ── 4. Report ──
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      warn(`failed to capture: ${failed.map((r) => r.name).join(', ')}`);
    }

    const gifFiles = [...results.map((r) => path.join(OUT_DIR, `${r.name}.png`)), gif.gifPath];
    console.log('\n=== capture summary ===');
    for (const file of gifFiles) {
      const size = existsSync(file) ? statSync(file).size : 0;
      console.log(`${path.relative(ROOT, file).padEnd(50)} ${String(size).padStart(9)} bytes`);
    }

    console.log('\n=== console errors captured per page ===');
    if (allIssues.length === 0) {
      console.log('  (none)');
    } else {
      for (const [pageName, list] of allIssues) {
        for (const message of list) {
          console.log(`[warn] ${pageName}: ${message}`);
        }
      }
    }

    browserClosed = true;
    await browser.close();
    return failed.length === 0 ? 0 : 1;
  } finally {
    if (!browserClosed) {
      await browser.close().catch(() => {});
    }
    killChildren();
  }
}

main()
  .then((code) => {
    killChildren();
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`\n[fatal] ${err.message}`);
    if (err.stack) console.error(err.stack);
    killChildren();
    process.exitCode = 1;
  });
