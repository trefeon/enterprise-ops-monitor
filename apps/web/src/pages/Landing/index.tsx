import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  FileCheck2,
  GitBranch,
  Globe,
  Layers3,
  Monitor,
  Play,
  Server,
  Shield,
  Terminal,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PortfolioNav from '../../components/portfolio/PortfolioNav';
import { projectStory } from '../../data/stories';

/* ─── Data ───────────────────────────────────────────── */

const metrics = [
  { value: '20+', label: 'API Endpoints' },
  { value: '16', label: 'RBAC Permissions' },
  { value: '101', label: 'E2E Tests' },
  { value: '3', label: 'Deploy Modes' },
];

const techStack: { name: string; category: string; icon: LucideIcon }[] = [
  { name: 'React 19', category: 'Frontend', icon: Globe },
  { name: 'TypeScript', category: 'Language', icon: Code2 },
  { name: 'Vite 7', category: 'Build', icon: Zap },
  { name: 'Tailwind CSS', category: 'Styling', icon: Layers3 },
  { name: 'Express 5', category: 'API', icon: Server },
  { name: 'PostgreSQL', category: 'Database', icon: Database },
  { name: 'Sequelize', category: 'ORM', icon: Layers3 },
  { name: 'Docker', category: 'Deploy', icon: Cloud },
];

const features: { title: string; description: string; icon: LucideIcon; route: string }[] = [
  {
    title: 'Real-time Dashboard',
    description:
      'KPI grid with health indicators, sync status, EOD completion, and active node count. Auto-refreshes during operational windows.',
    icon: Activity,
    route: '/app',
  },
  {
    title: 'Store Sync Monitor',
    description:
      'Live visibility into branch synchronization health. Stale detection, problem flagging, and historical trend analysis.',
    icon: Wifi,
    route: '/app/sync',
  },
  {
    title: 'EOD Process Tracker',
    description:
      'End-of-day completion monitoring across all branches. Area-level rollups, late upload detection, and export-ready reports.',
    icon: FileCheck2,
    route: '/app/eod',
  },
  {
    title: 'RBAC Access Control',
    description:
      'Role-based permissions with branch scoping. 7 built-in roles, granular permission overrides, and audit-ready user management.',
    icon: Shield,
    route: '/app/admin/roles',
  },
  {
    title: 'System Health',
    description:
      'Service status monitoring, database connectivity checks, log analysis, and container health metrics in one view.',
    icon: Monitor,
    route: '/app/system',
  },
  {
    title: 'Backup Management',
    description:
      'Scheduled and manual PostgreSQL backups with retention policies. Download, restore, and verify backup integrity.',
    icon: Database,
    route: '/app/backups',
  },
];

const architecture = [
  {
    layer: 'Frontend',
    tech: 'React + Vite + Tailwind',
    detail: 'SPA with route guards, base component library, and design token system',
  },
  {
    layer: 'API',
    tech: 'Express + Zod + JWT',
    detail: 'REST API with response envelope, input validation, and rate limiting',
  },
  {
    layer: 'Database',
    tech: 'PostgreSQL + Sequelize',
    detail: 'Migrations, RBAC schema, demo seeds, and automated backups',
  },
  {
    layer: 'Deploy',
    tech: 'Docker Compose + nginx',
    detail: 'Multi-container stack with health checks, autoheal, and remote deploy scripts',
  },
];

const faqs = [
  {
    q: 'Is this connected to real company data?',
    a: 'No. All data is simulated and anonymized. No internal hosts, credentials, customers, or private operational records are included.',
  },
  {
    q: 'Can I use this as a starter for my own project?',
    a: 'Yes. The public pages explain the work, and the protected app is structured as a reusable foundation for internal operations tools.',
  },
  {
    q: 'How is it deployed?',
    a: 'Docker Compose with three containers (React SPA, Express API, PostgreSQL). Includes automated remote deployment via SSH with rollback support.',
  },
];

/* ─── Components ─────────────────────────────────────── */

function NavBar() {
  return <PortfolioNav />;
}

function HeroDashboard() {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-1">
      <div className="relative overflow-hidden rounded-lg border border-border bg-background">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            </div>
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              dash.lmntea.fun/app
            </span>
          </div>
          <div className="rounded-full border border-status-success/40 bg-status-success/10 px-2 py-0.5 font-mono text-3xs font-medium text-status-success">
            LIVE
          </div>
        </div>
        {/* Dashboard content */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'System Health', value: '99.8%', color: 'text-status-success' },
              { label: 'Sync Status', value: 'Healthy', color: 'text-status-success' },
              { label: 'EOD Complete', value: '42/44', color: 'text-primary' },
              { label: 'Active Nodes', value: '128', color: 'text-foreground' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border bg-card p-3">
                <div className="font-mono text-3xs uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </div>
                <div className={`mt-2 text-xl font-medium tabular-nums ${kpi.color}`}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Operational Pulse</span>
                <span className="font-mono text-3xs text-muted-foreground">60s refresh</span>
              </div>
              <div className="flex h-20 items-end gap-1">
                {[40, 65, 55, 80, 72, 90, 68, 85, 78, 92, 60, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-primary/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-xs font-medium text-foreground">Recent Events</div>
              <div className="mt-3 space-y-1.5">
                {[
                  { text: 'Backup verified', time: '2m ago', status: 'success' },
                  { text: 'Agent heartbeat', time: '5m ago', status: 'success' },
                  { text: 'Late EOD upload', time: '12m ago', status: 'warning' },
                ].map((evt) => (
                  <div
                    key={evt.text}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-1.5 rounded-full ${evt.status === 'success' ? 'bg-status-success' : 'bg-status-warning'}`}
                      />
                      <span className="text-xs text-foreground">{evt.text}</span>
                    </div>
                    <span className="font-mono text-3xs text-muted-foreground">{evt.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function IconBox({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">
      <Icon aria-hidden="true" className="size-5 text-foreground" />
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */

export default function Landing() {
  return (
    <main
      className="min-h-screen bg-background text-foreground"
      data-debug-component-root="Landing"
    >
      <NavBar />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="portfolio-container pt-28 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-status-success" />
            Production-grade operations dashboard
          </div>
          <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Monitor branch operations
            <br />
            <span className="text-muted-foreground">with confidence</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Full-stack operations dashboard with real-time sync monitoring, EOD tracking, RBAC, and
            Docker deployment. Built for portfolio review with safe demo data.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Play aria-hidden="true" className="size-4" />
              Open Live Demo
            </Link>
            <Link
              to="/case-study"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              Read Case Study
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <HeroDashboard />
        </div>
      </section>

      {/* ── Metrics Bar ──────────────────────────────── */}
      <section className="border-y border-border">
        <div className="portfolio-container grid grid-cols-2 divide-x divide-border lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="px-6 py-8 text-center">
              <div className="font-display text-3xl font-medium tabular-nums text-foreground">
                {m.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="portfolio-container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Features</SectionLabel>
          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Everything an ops team needs
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Production-ready modules covering the full operations workflow, from monitoring to
            administration.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted-foreground/30"
            >
              <IconBox icon={f.icon} />
              <h3 className="mt-4 text-sm font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{f.description}</p>
              <Link
                to={f.route}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground"
              >
                Explore <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ───────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="portfolio-container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Tech Stack</SectionLabel>
            <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
              Modern, proven technologies
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {techStack.map((t) => {
              const TIcon = t.icon;
              return (
                <div
                  key={t.name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <TIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{t.name}</div>
                    <div className="text-3xs text-muted-foreground">{t.category}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Architecture ─────────────────────────────── */}
      <section className="portfolio-container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Architecture</SectionLabel>
          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Clean separation of concerns
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Four-layer architecture designed for maintainability and Docker deployment.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {architecture.map((layer, i) => (
            <div
              key={layer.layer}
              className="grid items-center gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-[100px_minmax(0,1fr)]"
            >
              <div>
                <div className="font-mono text-3xs uppercase tracking-wider text-muted-foreground">
                  Layer {i + 1}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">{layer.layer}</div>
              </div>
              <div>
                <div className="font-mono text-xs text-primary">{layer.tech}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{layer.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Docker Deploy ────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="portfolio-container py-20">
          <div className="mx-auto max-w-3xl">
            <SectionLabel>Deployment</SectionLabel>
            <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
              One command to deploy
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Docker Compose stack with automated health checks, database migrations, RBAC seeding,
              and remote deployment with rollback support.
            </p>
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <Terminal aria-hidden="true" className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">terminal</span>
              </div>
              <div className="p-4 font-mono text-sm leading-7">
                <div className="text-muted-foreground">
                  <span className="text-status-success">$</span> git clone
                  https://github.com/trefeon/enterprise-ops-monitor
                </div>
                <div className="text-muted-foreground">
                  <span className="text-status-success">$</span> cp .env.example .env
                </div>
                <div className="text-muted-foreground">
                  <span className="text-status-success">$</span> docker compose up -d
                </div>
                <div className="mt-2 text-muted-foreground/60">
                  # API on :3000, Web on :5173, Postgres on :5433
                </div>
                <div className="text-muted-foreground/60"># Demo mode: pnpm deploy --demo</div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: 'Health Checks',
                  detail: 'Container-level health monitoring with autoheal',
                },
                {
                  label: 'Zero Downtime',
                  detail: 'Git-based remote deploy with automatic rollback',
                },
                { label: 'Demo Mode', detail: 'Isolated demo stack with mock API and seeded data' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 aria-hidden="true" className="size-3.5 text-status-success" />
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Project Origin ─────────────────────────────── */}
      <section className="portfolio-container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Why this project exists</SectionLabel>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{projectStory.origin}</p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <section className="portfolio-container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Common questions
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-2xl space-y-3">
          {faqs.map((faq) => (
            <article key={faq.q} className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground">{faq.q}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.a}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="portfolio-container py-20 text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
            See it in action
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Demo account included. No setup needed. Explore the dashboard, review the case study,
            then check the source.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Open Live Demo
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
            <a
              href="https://github.com/trefeon/enterprise-ops-monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              <GitBranch aria-hidden="true" className="size-4" />
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="portfolio-container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">enterprise-ops-monitor</span>
            <span>v2.0.0</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a
              href="https://github.com/trefeon/enterprise-ops-monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <Link to="/case-study" className="transition-colors hover:text-foreground">
              Case Study
            </Link>
            <Link to="/starter" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <span>Simulated data only</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
