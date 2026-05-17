import React, { useState } from 'react';

export default function FeatureStoryBanner({ story }) {
  const [open, setOpen] = useState(true);

  if (!story || story.banner === false) return null;

  return (
    <section className="rounded-lg border border-border bg-muted/20 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-status-info/15 text-status-info">
            <span className="material-symbols-outlined text-lg">
              {story.materialIcon || 'info'}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              Why this feature exists
            </span>
            <span className="block truncate text-sm text-muted-foreground">{story.tagline}</span>
          </span>
        </span>
        <span className="material-symbols-outlined text-xl text-muted-foreground">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StoryBlock label="Problem" tone="text-status-error" text={story.problem} />
            <StoryBlock label="Solution" tone="text-status-info" text={story.solution} />
            <StoryBlock label="Impact" tone="text-status-success" text={story.impact} />
          </div>

          {(story.metrics?.length || story.techHighlight) && (
            <div className="mt-4 flex flex-col gap-3">
              {story.metrics?.length ? (
                <div className="flex flex-wrap gap-2">
                  {story.metrics.map((metric) => (
                    <span
                      key={`${metric.label}-${metric.value}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {metric.label}
                      <span className="font-semibold text-foreground">{metric.value}</span>
                    </span>
                  ))}
                </div>
              ) : null}

              {story.techHighlight ? (
                <div className="rounded-md border border-status-info/20 bg-status-info/10 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-status-info">Technical note: </span>
                  {story.techHighlight}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StoryBlock({ label, tone, text }) {
  return (
    <div className="space-y-1">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{label}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
