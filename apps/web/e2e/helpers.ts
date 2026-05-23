import {
  expect,
  type APIRequestContext,
  type APIResponse,
  type Locator,
  type Page,
} from '@playwright/test';

export const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
export const AUTH_FILE = 'playwright/.auth/demo-user.json';

export type RouteCase = {
  path: string;
  name: string;
  expectedText: RegExp;
  finalPath?: RegExp;
};

export const publicRoutes: RouteCase[] = [
  {
    path: '/login',
    name: 'Login',
    expectedText: /Welcome Back|Enterprise Monitor/i,
  },
  {
    path: '/live',
    name: 'Live Sync',
    expectedText: /Operational\s+Radar|Live Latency Monitor/i,
  },
  {
    path: '/live.html',
    name: 'Live Sync HTML alias',
    expectedText: /Operational\s+Radar|Live Latency Monitor/i,
  },
];

export const authenticatedRoutes: RouteCase[] = [
  { path: '/', name: 'Dashboard', expectedText: /Operations Hub/i },
  { path: '/eod', name: 'EOD Monitor', expectedText: /EOD Monitor/i },
  { path: '/stores', name: 'Store Directory', expectedText: /Store Directory/i },
  { path: '/sync', name: 'Store Sync', expectedText: /Store Sync Monitor/i },
  { path: '/identity', name: 'Employee Directory', expectedText: /Employee Directory/i },
  { path: '/backups', name: 'Backups', expectedText: /Backups Management/i },
  { path: '/system', name: 'System Health', expectedText: /System Health/i },
  { path: '/admin/users', name: 'Users', expectedText: /Users/i },
  { path: '/admin/roles', name: 'Roles', expectedText: /Roles Management/i },
  {
    path: '/admin/afterhours',
    name: 'After Hours',
    expectedText: /After-Hours PC Monitor/i,
  },
  { path: '/agent-updater', name: 'Agent Updater', expectedText: /Agent Updater/i },
  {
    path: '/office-agents',
    name: 'Office Agents',
    expectedText: /Office Agent Monitor/i,
  },
  { path: '/about', name: 'About', expectedText: /Portfolio|Feature/i },
  { path: '/profile', name: 'Profile', expectedText: /Profile/i },
];

export const redirectRoutes: RouteCase[] = [
  {
    path: '/eod-area',
    name: 'EOD legacy redirect',
    expectedText: /EOD Monitor/i,
    finalPath: /\/eod$/,
  },
  {
    path: '/not-a-real-route',
    name: 'Unknown route redirect',
    expectedText: /Operations Hub/i,
    finalPath: /\/$/,
  },
];

export function collectPageIssues(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  return {
    assertClean() {
      expect(consoleErrors, 'browser console errors').toEqual([]);
      expect(pageErrors, 'uncaught page errors').toEqual([]);
      expect(serverErrors, 'HTTP 500+ responses').toEqual([]);
    },
  };
}

export async function assertNoFrameworkOverlay(page: Page) {
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('nextjs-portal')).toHaveCount(0);
  await expect(page.locator('#webpack-dev-server-client-overlay')).toHaveCount(0);
}

export async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth, 'document horizontal overflow').toBeLessThanOrEqual(
    metrics.viewportWidth + 1,
  );
}

export async function assertNoOverlappingElements(page: Page, selector: string) {
  const overlaps = await page.evaluate((targetSelector) => {
    const boxes = Array.from(document.querySelectorAll(targetSelector)).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    });

    const failures: string[] = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const xOverlap = Math.max(0, Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left));
        const yOverlap = Math.max(0, Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top));
        if (xOverlap > 1 && yOverlap > 1) failures.push(`${boxes[i].index}:${boxes[j].index}`);
      }
    }

    return failures;
  }, selector);

  expect(overlaps, `${selector} elements should not overlap`).toEqual([]);
}

export async function expectLocatorHasContent(locator: Locator, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const text = (await locator.innerText()).replace(/\s+/g, ' ').trim();
  expect(text, `${label} should have content`).not.toEqual('');
}

export async function assertDashboardSections(page: Page) {
  const grid = page.locator('[data-e2e="dashboard-kpi-grid"]');
  await expect(grid).toBeVisible();

  const cards = grid.locator('[data-slot="card"]');
  await expect(cards).toHaveCount(4);
  await expect(grid).toContainText(/Global Health/i);
  await expect(grid).toContainText(/Sync Status/i);
  await expect(grid).toContainText(/EOD Completion/i);
  await expect(grid).toContainText(/Active Nodes/i);

  for (let index = 0; index < 4; index += 1) {
    await expectLocatorHasContent(cards.nth(index), `dashboard KPI card ${index + 1}`);
  }

  const gridText = (await grid.innerText()).replace(/\s+/g, ' ').trim();
  expect(gridText, 'dashboard KPI cards should not show placeholder values').not.toMatch(/--|0\/0/);

  await expectLocatorHasContent(page.locator('[data-e2e="dashboard-operational-pulse"]'), 'operational pulse');
  await expectLocatorHasContent(page.locator('[data-e2e="dashboard-alerts"]'), 'recent alerts');
  await expectLocatorHasContent(page.locator('[data-e2e="dashboard-actions"]'), 'quick actions');
}

export async function assertDashboardResponsive(page: Page, expectedColumns: number) {
  await page.goto('/');
  await assertDashboardSections(page);
  await assertNoFrameworkOverlay(page);
  await assertNoHorizontalOverflow(page);
  await assertNoOverlappingElements(page, '[data-e2e="dashboard-kpi-grid"] > [data-slot="card"]');

  const columns = await page.locator('[data-e2e="dashboard-kpi-grid"]').evaluate((element) => {
    return getComputedStyle(element)
      .gridTemplateColumns.split(' ')
      .filter(Boolean).length;
  });

  expect(columns, 'dashboard KPI grid column count').toBe(expectedColumns);
}

export async function getApiData<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${API_URL}${path}`);
  expect(response.status(), `${path} status`).toBeLessThan(500);

  const body = await response.json();
  expect(body.ok, `${path} envelope ok`).toBe(true);
  expect(body.error ?? null, `${path} envelope error`).toBeNull();

  return body.data as T;
}

export async function expectVisibleBodyText(page: Page, value: string | number, label: string) {
  const text = String(value).trim();
  expect(text, `${label} source value`).not.toEqual('');
  await expect(page.locator('body'), `${label} visible on page`).toContainText(text);
}

export async function assertRouteHealthy(page: Page, route: RouteCase) {
  const issues = collectPageIssues(page);

  await page.goto(route.path);
  if (route.finalPath) {
    await expect(page).toHaveURL(route.finalPath);
  }

  await expect(page.locator('body')).toContainText(route.expectedText);
  await expect(page.locator('body')).not.toContainText(/Failed to load|Internal Server Error/i);
  await assertNoFrameworkOverlay(page);
  await assertNoHorizontalOverflow(page);

  issues.assertClean();
}

export async function loginViaApi(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: 'demo', password: 'demo123' },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.data?.token).toEqual(expect.any(String));
  expect(body.data?.user?.isDemo).toBe(true);

  return body.data as { token: string; user: Record<string, unknown> };
}

export async function expectDemoReadOnly(responsePromise: Promise<APIResponse>) {
  const response = await responsePromise;
  expect(response.status()).toBe(403);

  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe('DEMO_READ_ONLY');
}
