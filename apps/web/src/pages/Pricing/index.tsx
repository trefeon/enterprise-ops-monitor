import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Monitor,
  Store,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ─── Data ──────────────────────────────────────────────── */

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  popular?: boolean;
  features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Rp49',
    unit: 'rb/branch/bulan',
    description: 'For small operations with 1–5 branches.',
    features: [
      { text: 'Dashboard & EOD monitoring', included: true },
      { text: 'Store sync monitoring', included: true },
      { text: 'Employee directory', included: true },
      { text: 'Basic backups', included: true },
      { text: 'Email support', included: true },
      { text: 'Priority support', included: false },
      { text: 'Live Menu Display', included: false },
      { text: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'Rp79',
    unit: 'rb/branch/bulan',
    description: 'For growing teams scaling across regions.',
    popular: true,
    features: [
      { text: 'Dashboard & EOD monitoring', included: true },
      { text: 'Store sync monitoring', included: true },
      { text: 'Employee directory', included: true },
      { text: 'Advanced backups', included: true },
      { text: 'Email support', included: true },
      { text: 'Priority support', included: true },
      { text: 'Live Menu Display add-on', included: true },
      { text: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 'Rp69',
    unit: 'rb/branch/bulan',
    description: 'For enterprise multi-branch operations.',
    features: [
      { text: 'Dashboard & EOD monitoring', included: true },
      { text: 'Store sync monitoring', included: true },
      { text: 'Employee directory', included: true },
      { text: 'Advanced backups', included: true },
      { text: 'Email + priority support', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Live Menu Display add-on', included: true },
      { text: 'Custom integrations', included: true },
    ],
  },
];

const ADDONS = [
  {
    icon: Monitor,
    name: 'Live Menu Display',
    price: 'Rp30rb',
    unit: '/screen/bulan',
    description:
      'Display your menu, promotions, and announcements on in-store screens. First screen free per outlet.',
  },
];

/* ─── Components ────────────────────────────────────────── */

function PricingCard({ plan, index: _index }: { plan: Plan; index: number }) {
  return (
    <Card
      className={cn(
        'relative flex flex-col',
        plan.popular && 'border-primary/40 shadow-lg shadow-cyan-500/5'
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="bg-primary text-primary-foreground text-3xs font-semibold px-3 py-1">
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className={cn(plan.popular && 'pt-8')}>
        <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        <div>
          <span className="text-3xl font-bold tabular-nums text-foreground">{plan.price}</span>
          <span className="ml-1.5 text-sm text-muted-foreground">{plan.unit}</span>
        </div>

        <ul className="space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature.text} className="flex items-start gap-2.5">
              <CheckCircle2
                aria-hidden="true"
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  feature.included ? 'text-status-success' : 'text-muted-foreground/30'
                )}
              />
              <span
                className={cn(
                  'text-sm',
                  feature.included ? 'text-foreground' : 'text-muted-foreground/50 line-through'
                )}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
          <Link to={plan.popular ? '/login' : '/login'}>
            {plan.popular ? 'Start Free Trial' : 'Get Started'}
            <ArrowRight aria-hidden="true" className="ml-2 size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ─── Page ──────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground" data-debug-component-root="Pricing">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="portfolio-container flex h-14 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-sm font-bold tracking-tight text-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground font-mono text-xs font-black text-background">
              E
            </span>
            Enterprise Ops
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              to="/login"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              Start Free Trial
              <ArrowRight aria-hidden="true" className="size-3" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="portfolio-container pt-28 pb-12 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <CreditCard aria-hidden="true" className="size-3" />
            Simple, transparent pricing
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Pricing that scales
            <br />
            <span className="text-muted-foreground">with your operations</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
            Per-branch pricing with no hidden fees. All plans include a 14-day free trial.
            Cancel anytime.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="portfolio-container pb-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <PricingCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>
      </section>

      {/* Add-ons */}
      <section className="border-t border-border bg-card/30">
        <div className="portfolio-container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Add-ons
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enhance your operations with optional extras.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-2xl gap-4">
            {ADDONS.map((addon) => (
              <Card key={addon.name}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">
                        <addon.icon aria-hidden="true" className="size-5 text-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{addon.name}</CardTitle>
                        <CardDescription>{addon.description}</CardDescription>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-bold tabular-nums text-foreground">
                        {addon.price}
                      </div>
                      <div className="text-3xs uppercase tracking-wide text-muted-foreground">
                        {addon.unit}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="portfolio-container py-16 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Ready to get started?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Start your 14-day free trial. No credit card required.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Start Free Trial
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            to="/case-study"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-card"
          >
            Read Case Study
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="portfolio-container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Store aria-hidden="true" className="size-3" />
            <span>enterprise-ops-monitor</span>
            <span>v2.0.0</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/case-study" className="transition-colors hover:text-foreground">
              Case Study
            </Link>
            <Link to="/starter" className="transition-colors hover:text-foreground">
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
