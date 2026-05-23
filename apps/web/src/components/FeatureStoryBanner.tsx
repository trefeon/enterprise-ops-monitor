import { type ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Contact,
  Database,
  FileText,
  Info,
  Laptop,
  LayoutDashboard,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Store,
  Tv,
  UserCircle,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureMetric {
  label: string;
  value: string;
}

interface FeatureStory {
  banner?: boolean;
  materialIcon?: string;
  tagline?: string;
  problem?: string;
  solution?: string;
  impact?: string;
  metrics?: FeatureMetric[];
  techHighlight?: string;
}

interface FeatureStoryBannerProps {
  story?: FeatureStory | null;
}

interface StoryBlockProps {
  label: string;
  tone: string;
  text?: string;
  icon: ReactNode;
}

const ICON_MAP: Record<string, LucideIcon> = {
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

export default function FeatureStoryBanner({ story }: FeatureStoryBannerProps) {
  const [open, setOpen] = useState(false);

  if (!story || story.banner === false) return null;

  const Icon = ICON_MAP[story.materialIcon || 'info'] || ICON_MAP.info;

  return (
    <motion.section
      className="group rounded-lg border border-primary/20 bg-primary/[0.03] transition-colors hover:border-primary/30"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <Icon className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
              Feature Narrative
            </span>
            <span className="line-clamp-2 block text-base font-bold leading-snug text-foreground">
              {story.tagline}
            </span>
          </span>
        </span>
        <div className="flex size-8 items-center justify-center rounded-md border bg-secondary text-muted-foreground transition-colors group-hover:text-primary">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {open && (
        <div className="animate-in slide-in-from-top-2 fade-in border-t border-primary/10 px-5 pb-5 pt-5 duration-200">
          <p className="mb-5 text-sm font-medium leading-relaxed text-foreground">
            {story.tagline}
          </p>
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
                      <span className="text-[9px] font-black uppercase leading-none tracking-wider text-muted-foreground">
                        {metric.label}
                      </span>
                      <span className="text-xs font-bold leading-none text-foreground">
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {story.techHighlight && (
                <div className="flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/[0.02] px-4 py-3">
                  <div className="mt-0.5 shrink-0 text-primary">
                    <Zap className="size-4" />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="mr-1.5 font-black uppercase tracking-wider text-primary">
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
    </motion.section>
  );
}

function StoryBlock({ label, tone, text, icon }: StoryBlockProps) {
  return (
    <div className="space-y-2">
      <div className={cn('flex items-center gap-1.5', tone)}>
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="break-words text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
