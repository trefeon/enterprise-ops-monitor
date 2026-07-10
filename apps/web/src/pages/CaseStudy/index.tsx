import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  Globe,
  Layers3,
  Lock,
  Server,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { featureStories, projectStory } from '../../data/stories';

const challengeMetrics = [
  { label: 'Branches monitored', value: '8' },
  { label: 'EOD deadline', value: '19:30 WIB' },
  { label: 'Sync polling', value: '60s' },
  { label: 'RBAC permissions', value: '31' },
];

const architectureLayers = [
  {
    label: 'Frontend',
    tech: 'React 19, Vite 7, TypeScript, Tailwind CSS',
    decisions: [
      'Route-level code splitting with lazy imports',
      'Three-tier component architecture (ui / base / shared)',
      'Design token system for consistent spacing and color',
      'Permission-filtered navigation and route guards',
    ],
  },
  {
    label: 'API',
    tech: 'Express 5, Sequelize, Zod, JWT',
    decisions: [
      'Consistent { ok, data, meta, error } response envelope',
      'Zod validation in route files before controller handlers',
      'Rate limiting, CORS, Helmet security headers',
      'Branch-scoped RBAC with permission overrides',
    ],
  },
  {
    label: 'Database',
    tech: 'PostgreSQL 15, Sequelize Migrations',
    decisions: [
      'Forward-only migration strategy with rollback support',
      'RBAC v2 schema: roles, permissions, overrides, branch scopes',
      'Demo seed pipeline for safe portfolio data',
      'Automated daily backups with retention policies',
    ],
  },
  {
    label: 'Infrastructure',
    tech: 'Docker Compose, nginx, SSH deploy',
    decisions: [
      'Multi-container stack with health checks and autoheal',
      'nginx SPA routing with API reverse proxy',
      'Git-based remote deployment with automatic rollback',
      'Three deploy modes: production, demo-db, demo-mock',
    ],
  },
];

const keyFeatures = featureStories.slice(0, 8);

export default function CaseStudy() {
  return (
    <main className="min-h-screen bg-background text-foreground" data-debug-component-root="Case-Study">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="portfolio-container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-display text-sm font-medium tracking-tight text-foreground">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground font-mono text-xs font-medium text-background">
              E
            </span>
            Enterprise Ops
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link className="text-muted-foreground transition-colors hover:text-foreground" to="/">
              Home
            </Link>
            <Link
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
              to="/login"
            >
              Live Demo
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="portfolio-container pt-28 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Code2 aria-hidden="true" className="size-3" />
            Portfolio Case Study
          </div>
          <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
            From IT support workflow to
            <br />
            <span className="text-muted-foreground">production operations platform</span>
          </h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground">
            {projectStory.context}
          </p>
          <p className="mt-4 rounded-lg border border-border bg-card p-4 text-xs leading-5 text-muted-foreground">
            <strong className="text-foreground">Disclosure:</strong> {projectStory.disclosure}
          </p>
        </div>
      </section>

      {/* Problem / Solution / Impact */}
      <section className="border-y border-border">
        <div className="portfolio-container grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {[
            {
              title: 'Problem',
              body: 'Branch operations need fast visibility across sync, EOD, backups, access, and systems. Scattered tools and shared admin access create blind spots.',
            },
            {
              title: 'Solution',
              body: projectStory.outcome,
            },
            {
              title: 'Impact',
              body: 'A reviewer can inspect a working product, understand the architecture, and reuse the structure for another operations application.',
            },
          ].map((item) => (
            <article key={item.title} className="px-6 py-8">
              <div className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.title}</div>
              <p className="mt-3 text-sm leading-6 text-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Challenge metrics */}
      <section className="border-b border-border bg-card/30">
        <div className="portfolio-container grid grid-cols-2 divide-x divide-border lg:grid-cols-4">
          {challengeMetrics.map((m) => (
            <div key={m.label} className="px-6 py-8 text-center">
              <div className="font-display text-2xl font-medium tabular-nums text-foreground">{m.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="portfolio-container py-20">
        <div className="mx-auto max-w-3xl">
          <div className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">Architecture</div>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground">
            Four-layer separation of concerns
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Each layer can be replaced or scaled independently. The architecture keeps production-like
            boundaries while staying safe for public portfolio review.
          </p>

          <div className="mt-12 space-y-4">
            {architectureLayers.map((layer, i) => (
              <div key={layer.label} className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                      <h3 className="text-sm font-medium text-foreground">{layer.label}</h3>
                    </div>
                    <div className="mt-1 font-mono text-xs text-primary">{layer.tech}</div>
                  </div>
                </div>
                <div className="grid gap-2 p-5 sm:grid-cols-2">
                  {layer.decisions.map((decision) => (
                    <div key={decision} className="flex gap-2">
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-status-success" />
                      <span className="text-xs leading-5 text-muted-foreground">{decision}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Coverage */}
      <section className="border-y border-border bg-card/30">
        <div className="portfolio-container py-20">
          <div className="mx-auto max-w-3xl">
            <div className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">Features</div>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground">
              Production feature coverage
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Each feature demonstrates a specific product decision. Click through to the live demo to explore.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
            {keyFeatures.map((feature) => (
              <article key={feature.id} className="rounded-lg border border-border bg-background p-5 transition-colors hover:border-muted-foreground/30">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-3xs uppercase tracking-wider text-primary">{feature.route}</span>
                </div>
                <h3 className="mt-3 text-sm font-medium text-foreground">{feature.featureName}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{feature.tagline}</p>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="text-3xs font-medium uppercase tracking-wider text-muted-foreground">Solution</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{feature.solution}</p>
                </div>
                {feature.metrics && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {feature.metrics.map((m) => (
                      <span key={m.label} className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-3xs text-muted-foreground">
                        {m.label}: {m.value}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="portfolio-container py-20">
        <div className="mx-auto max-w-3xl">
          <div className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">Stack</div>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground">
            Technology choices
          </h2>
          <div className="mt-8 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Layer</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Technologies</th>
                </tr>
              </thead>
              <tbody>
                {projectStory.techStack.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-xs font-medium text-foreground">{row.label}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="portfolio-container py-16 text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Explore the live demo
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Demo account included. Log in, explore every feature, then review the source code.
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
              View Source
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="portfolio-container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">enterprise-ops-monitor</span>
            <span>v2.0.0</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
            <a
              href="https://github.com/trefeon/enterprise-ops-monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <span>Simulated data only</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
