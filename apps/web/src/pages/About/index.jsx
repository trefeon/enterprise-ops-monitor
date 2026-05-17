import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Divider from '../../components/ui/Divider';
import StatusBadge from '../../components/ui/StatusBadge';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { featureStories, getFeatureStory, projectStory } from '../../data/stories';

export default function About() {
  const bannerCount = featureStories.filter((story) => story.banner !== false).length;

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('about')} />

      <PageHeader
        title={projectStory.name}
        subtitle={projectStory.tagline}
        meta={`Portfolio storytelling for ${featureStories.length} verified feature surfaces, including ${bannerCount} in-app banners.`}
      />

      <Card variant="compact" className="border-status-info/30 bg-status-info/5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-status-info">verified_user</span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Demo disclosure</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {projectStory.disclosure}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-2">
        <Card title="Background">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{projectStory.context}</p>
            <p>{projectStory.outcome}</p>
          </div>
        </Card>

        <Card title="Verified Surface">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Feature stories" value={featureStories.length} />
            <Metric label="Page banners" value={bannerCount} />
            <Metric label="Authenticated About" value="Yes" />
            <Metric label="Backend changes" value="None" />
          </div>
        </Card>
      </div>

      <Divider className="my-2" />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-primary">deployed_code</span>
          <h2 className="section-title mb-0">Tech Stack</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projectStory.techStack.map((item) => (
            <Card key={item.label} variant="compact">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-primary">auto_stories</span>
          <h2 className="section-title mb-0">Feature Stories</h2>
        </div>

        <div className="space-y-4">
          {featureStories.map((story) => (
            <Card key={story.id}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <span className="material-symbols-outlined text-xl">
                        {story.materialIcon || 'info'}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {story.featureName}
                        </h3>
                        {story.banner === false ? (
                          <StatusBadge variant="info" size="sm">
                            About only
                          </StatusBadge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{story.tagline}</p>
                    </div>
                  </div>
                  <Link
                    to={story.route}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                    Open
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <StoryColumn label="Problem" tone="text-status-error" text={story.problem} />
                  <StoryColumn label="Solution" tone="text-status-info" text={story.solution} />
                  <StoryColumn label="Impact" tone="text-status-success" text={story.impact} />
                </div>

                {story.metrics?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {story.metrics.map((metric) => (
                      <span
                        key={`${story.id}-${metric.label}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {metric.label}
                        <span className="font-semibold text-foreground">{metric.value}</span>
                      </span>
                    ))}
                  </div>
                ) : null}

                {story.techHighlight ? (
                  <div className="rounded-md border border-status-info/20 bg-status-info/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-status-info">Technical note: </span>
                    {story.techHighlight}
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StoryColumn({ label, tone, text }) {
  return (
    <div className="space-y-1">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{label}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
