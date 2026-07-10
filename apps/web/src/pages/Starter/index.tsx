import { ArrowRight, CheckCircle2, ClipboardList, Code2, Database, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    title: 'Replace domain copy',
    detail: 'Swap product labels, sidebar names, route copy, and disclosure text for the next project.',
    icon: ClipboardList,
  },
  {
    title: 'Add a module',
    detail: 'Reuse existing page, table, filter, export, and route-guard patterns for a new workflow.',
    icon: Code2,
  },
  {
    title: 'Seed safe data',
    detail: 'Generate realistic fake rows and keep secrets in environment placeholders only.',
    icon: Database,
  },
  {
    title: 'Map permissions',
    detail: 'Add route permissions, RBAC seeds, demo restrictions, and guarded UI actions.',
    icon: ShieldCheck,
  },
];

export default function Starter() {
  return (
    <main className="min-h-screen bg-background text-foreground" data-debug-component-root="Starter">
      <header className="portfolio-container flex items-center justify-between py-5">
        <Link to="/" className="font-display text-sm font-medium text-foreground">
          Enterprise Ops Starter
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link className="text-muted-foreground hover:text-foreground" to="/case-study">
            Case Study
          </Link>
          <Link
            className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/85"
            to="/login"
          >
            Open Demo
          </Link>
        </div>
      </header>

      <section className="portfolio-container pb-12 pt-10">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            Reusable project base
          </div>
          <h1 className="font-display text-4xl font-medium tracking-normal text-foreground sm:text-5xl">
            Start another operations app from proven dashboard patterns.
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Use this repo as a bootstrapped foundation for authenticated dashboards that need modules,
            permissions, exports, fake demo data, and Docker-friendly local runs.
          </p>
        </div>
      </section>

      <section className="portfolio-container grid gap-4 pb-14 md:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="rounded-lg border border-border bg-card p-5">
              <Icon aria-hidden="true" className="mb-5 size-5 text-primary" />
              <h2 className="text-base font-medium text-foreground">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="border-t border-border bg-card/50">
        <div className="portfolio-container grid gap-4 py-10 lg:grid-cols-3">
          {['pnpm dev', 'pnpm --filter web test', 'docker compose up -d'].map((command) => (
            <div key={command} className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <CheckCircle2 aria-hidden="true" className="size-4 text-primary" />
              <code className="text-sm text-muted-foreground">{command}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="portfolio-container flex flex-col gap-3 py-12 md:flex-row">
        <Link
          to="/login"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85"
        >
          Open Demo
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <a
          href="https://github.com/trefeon/enterprise-ops-monitor"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
        >
          View GitHub
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </section>
    </main>
  );
}
