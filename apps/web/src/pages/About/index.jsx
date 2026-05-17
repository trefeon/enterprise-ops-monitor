import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell';
import { StatCard } from '@/components/shared/StatCard';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { featureStories, getFeatureStory, projectStory } from '../../data/stories';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  Layers,
  ShieldCheck,
  Monitor,
  Code2,
  ExternalLink,
  Shield,
  CheckCircle2,
  ChevronRight,
  Workflow,
  GanttChart,
  Zap,
} from 'lucide-react';

const PILLARS = [
  {
    id: 'monitoring',
    name: 'Real-Time Monitoring',
    icon: <Monitor className="size-5" />,
    description: 'Mission-critical visibility for retail operations and system integrity.',
    stories: ['dashboard', 'store-sync', 'eod-monitor', 'system', 'live-sync'],
  },
  {
    id: 'automation',
    name: 'Operational Automation',
    icon: <Workflow className="size-5" />,
    description: 'Self-healing processes, scheduled backups, and automated rollout triggers.',
    stories: ['backups', 'agent-updater', 'office-agents', 'after-hours', 'after-hours-report'],
  },
  {
    id: 'governance',
    name: 'Enterprise Governance',
    icon: <ShieldCheck className="size-5" />,
    description: 'Strict RBAC, branch-scoped access, and comprehensive accountability audits.',
    stories: ['accounts', 'roles', 'store-directory', 'employee-directory'],
  },
  {
    id: 'account',
    name: 'Self-Service & Access',
    icon: <Layers className="size-5" />,
    description: 'Unified account management and secure session controls.',
    stories: ['profile', 'logout', 'about'],
  },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('about')} />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-primary/5 border border-primary/10 p-8 md:p-12 mb-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            <Rocket className="size-3" /> Portfolio Case Study
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            {projectStory.name}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            {projectStory.tagline}
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-status-success" /> Verified for HR Review
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-status-success" /> Live Interactive Demo
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
          <Monitor className="portfolio-hero-monitor" />
        </div>
      </section>

      {/* High Level Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-muted/20 border-none">
              <CardContent className="pt-6">
                <h3 className="text-sm font-bold uppercase text-primary mb-2 flex items-center gap-2">
                  <GanttChart className="size-4" /> Context
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {projectStory.context}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/20 border-none">
              <CardContent className="pt-6">
                <h3 className="text-sm font-bold uppercase text-primary mb-2 flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> Outcome
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {projectStory.outcome}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="p-4 rounded-xl border border-status-info/20 bg-status-info/5 flex items-start gap-4">
            <Shield className="size-5 text-status-info shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase text-status-info tracking-widest">
                Demo Disclosure
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {projectStory.disclosure}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <StatCard
            title="Total Features"
            value={featureStories.length}
            icon={<Layers className="size-5" />}
          />
          <StatCard
            title="Tech Stack Focus"
            value="Fullstack JS"
            icon={<Code2 className="size-5" />}
          />
          <StatCard
            title="Dev Readiness"
            value="Production"
            icon={<CheckCircle2 className="size-5" />}
            accent="text-status-success"
          />
        </div>
      </div>

      {/* Tech Stack Horizontal */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Code2 className="size-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">The Modern Stack</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {projectStory.techStack.map((item) => (
            <div
              key={item.label}
              className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all"
            >
              <div className="flex flex-col gap-1">
                <span className="live-text-3xs font-black text-muted-foreground uppercase tracking-widest">
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Story Pillars */}
      <section className="space-y-16">
        {PILLARS.map((pillar) => (
          <div key={pillar.id} className="space-y-8">
            <div className="border-l-4 border-primary pl-6 py-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-primary">{pillar.icon}</div>
                <h2 className="portfolio-pillar-title">{pillar.name}</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">{pillar.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {featureStories
                .filter((s) => pillar.stories.includes(s.id))
                .map((story) => (
                  <Card
                    key={story.id}
                    className="group overflow-hidden border-border/50 hover:border-primary/40 transition-all"
                  >
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Title Column */}
                        <div className="lg:col-span-4 p-6 bg-muted/10 border-b lg:border-b-0 lg:border-r border-border/40">
                          <div className="flex flex-col h-full justify-between gap-4">
                            <div>
                              <div className="portfolio-feature-tag">
                                {story.id.replace('-', ' ')}
                              </div>
                              <h3 className="text-xl font-black text-foreground mb-1 group-hover:text-primary transition-colors">
                                {story.featureName}
                              </h3>
                              <p className="text-sm text-muted-foreground font-medium italic">
                                "{story.tagline}"
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-fit h-9 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                              onClick={() => navigate(story.route)}
                            >
                              Explore Feature <ExternalLink className="ml-2 size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Content Column */}
                        <div className="lg:col-span-8 p-6 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <p className="portfolio-story-label text-status-error">The Problem</p>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {story.problem}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="portfolio-story-label text-status-success">
                                The Solution
                              </p>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {story.solution}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center gap-4 pt-4 border-t border-border/40">
                            <div className="flex-1 space-y-1">
                              <p className="portfolio-story-label text-primary">Business Impact</p>
                              <p className="text-sm font-semibold text-foreground leading-relaxed">
                                {story.impact}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {story.metrics?.map((m) => (
                                <div
                                  key={m.label}
                                  className="px-2.5 py-1 rounded-lg bg-background border border-border flex flex-col gap-0.5"
                                >
                                  <span className="live-text-3xs font-black text-muted-foreground uppercase tracking-widest leading-none">
                                    {m.label}
                                  </span>
                                  <span className="text-xs font-bold text-foreground leading-none">
                                    {m.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {story.techHighlight && (
                            <div className="portfolio-tech-note">
                              <div className="mt-0.5 text-primary shrink-0">
                                <Zap className="size-4" />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-black text-primary mr-1 uppercase">
                                  Engineering Note:
                                </span>
                                {story.techHighlight}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section className="mt-24 mb-16 text-center py-16 border-t border-border/40">
        <h2 className="text-3xl font-black text-foreground mb-4 italic">
          Ready to see it in action?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          The Operations Hub demo is fully interactive. You can explore all pillars from monitoring
          to enterprise governance right now.
        </p>
        <Button
          size="lg"
          className="rounded-full px-8 h-12 text-base font-bold shadow-xl shadow-primary/20"
          onClick={() => navigate('/')}
        >
          Launch Operations Hub <ChevronRight className="ml-2 size-5" />
        </Button>
      </section>
    </PageShell>
  );
}
