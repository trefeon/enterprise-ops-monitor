import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ExternalLink, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Case Study', to: '/case-study' },
  { label: 'Starter', to: '/starter' },
];

const GITHUB_URL = 'https://github.com/trefeon/enterprise-ops-monitor';

export default function PortfolioNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (to: string) => pathname === to;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="portfolio-container flex h-14 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-display text-sm font-medium tracking-tight text-foreground"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground font-mono text-xs font-medium text-background">
            E
          </span>
          Enterprise Ops
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(item.to) ? 'page' : undefined}
              className={
                isActive(item.to)
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              {item.label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
            <ExternalLink aria-hidden="true" className="size-3" />
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {/* Desktop CTA */}
          <Link
            to="/login"
            className="hidden h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90 md:inline-flex"
          >
            Live Demo
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex size-8 items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
          >
            {open ? (
              <X aria-hidden="true" className="size-4" />
            ) : (
              <Menu aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-md md:hidden">
          <nav className="portfolio-container flex flex-col gap-1 py-3 text-sm" aria-label="Mobile">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                className={
                  isActive(item.to)
                    ? 'rounded-md bg-muted px-3 py-2 font-medium text-foreground'
                    : 'rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                }
              >
                {item.label}
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              GitHub
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
            <Link
              to="/login"
              className="mt-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background"
            >
              Live Demo
              <ArrowRight aria-hidden="true" className="size-3" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
