import type { ComponentProps, ReactNode } from 'react';
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { DashboardLayout } from '@/components/base';
import { cn } from '@/lib/utils';
import { MetaLine } from './meta-line';
import { PageHeader } from './page-header';

type FeatureStory = ComponentProps<typeof FeatureStoryBanner>['story'];

export interface PageTemplateProps {
  /**
   * Feature narrative for the banner slot. Omit (or pass null) to render no
   * banner. When present, the banner is ALWAYS first - the unified order is
   * banner -> header -> meta -> content.
   */
  story?: FeatureStory | null;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-side header actions (Refresh, Export, Create...). */
  actions?: ReactNode;
  /** Meta items rendered as a bullet-separated MetaLine below the header. */
  meta?: ReactNode[];
  /** Constrain the whole page column (utility pages such as Profile/Logout). */
  constrained?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * PageTemplate - the unified page skeleton for all 15 ops pages.
 *
 * Composes the fixed stack: FeatureStoryBanner -> PageHeader -> MetaLine ->
 * page content (KpiRow, SectionCard/TableCard, dialogs). Archetypes differ
 * only in which middle blocks the page fills in; the shell never varies.
 *
 * Fatal/empty states bypass the template: render DashboardLayout + EmptyState
 * directly, exactly like the current early returns do.
 */
export function PageTemplate({
  story,
  title,
  subtitle,
  actions,
  meta,
  constrained = false,
  className,
  children,
}: PageTemplateProps) {
  const content = (
    <>
      {story ? <FeatureStoryBanner story={story} /> : null}
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {meta && meta.length > 0 ? <MetaLine items={meta} /> : null}
      {children}
    </>
  );

  return (
    <DashboardLayout className={cn(className)}>
      {constrained ? (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">{content}</div>
      ) : (
        content
      )}
    </DashboardLayout>
  );
}

export default PageTemplate;
