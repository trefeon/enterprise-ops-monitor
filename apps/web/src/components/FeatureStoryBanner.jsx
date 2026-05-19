import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  LayoutDashboard,
  RefreshCw,
  ClipboardCheck,
  Store,
  Contact,
  Database,
  Activity,
  ShieldCheck,
  Laptop,
  Users,
  Lock,
  Moon,
  FileText,
  LogOut,
  UserCircle,
  Tv,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  dashboard: LayoutDashboard,
  sync: RefreshCw,
  fact_check: ClipboardCheck,
  store: Store,
  badge: Contact,
  backup: Database,
  monitor_heart: Activity,
  browser_updated: ShieldCheck,
  computer: Laptop,
  manage_accounts: Users,
  admin_panel_settings: Lock,
  nightlight: Moon,
  summarize: FileText,
  logout: LogOut,
  account_circle: UserCircle,
  info: Info,
  live_tv: Tv,
};

export default function FeatureStoryBanner({ story }) {
  const [open, setOpen] = useState(false);

  if (!story || story.banner === false) return null;

  const Icon = ICON_MAP[story.materialIcon] || ICON_MAP.info;

  return (
    <section className="group rounded-lg border border-primary/20 bg-primary/[0.03] transition-colors hover:border-primary/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <Icon className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
              Feature Narrative
            </span>
            <span className="block truncate text-base font-bold text-foreground">
              {story.tagline}
            </span>
          </span>
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-secondary text-muted-foreground transition-colors group-hover:text-primary">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {open && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200 border-t border-primary/10 px-5 pb-5 pt-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <StoryBlock
              label="The Problem"
              tone="text-status-error"
              text={story.problem}
              icon={<AlertCircle className="size-3" />}
            />
            <StoryBlock
              label="The Solution"
              tone="text-status-info"
              text={story.solution}
              icon={<Zap className="size-3" />}
            />
            <StoryBlock
              label="Business Impact"
              tone="text-status-success"
              text={story.impact}
              icon={<ShieldCheck className="size-3" />}
            />
          </div>

          {(story.metrics?.length || story.techHighlight) && (
            <div className="mt-6 flex flex-col gap-4 border-t border-primary/10 pt-5">
              {story.metrics?.length ? (
                <div className="flex flex-wrap gap-2">
                  {story.metrics.map((metric) => (
                    <div
                      key={`${metric.label}-${metric.value}`}
                      className="flex flex-col gap-0.5 rounded-md border border-border bg-background px-3 py-1.5"
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground leading-none">
                        {metric.label}
                      </span>
                      <span className="text-xs font-bold text-foreground leading-none">
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {story.techHighlight && (
                <div className="flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/[0.02] px-4 py-3">
                  <div className="mt-0.5 text-primary shrink-0">
                    <Zap className="size-4" />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-black uppercase tracking-wider text-primary mr-1.5">
                      Engineering Note:
                    </span>
                    {story.techHighlight}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StoryBlock({ label, tone, text, icon }) {
  return (
    <div className="space-y-2">
      <div className={cn('flex items-center gap-1.5', tone)}>
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
