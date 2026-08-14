/**
 * Operations page template - the unified page skeleton for all 15 ops pages.
 *
 * Composition rule: PageTemplate (banner -> header -> meta -> content) is the
 * shell; pages fill the middle with KpiRow, SectionHeading/SectionCard, and
 * TableCard (the terminal element). Fatal/empty states bypass the template
 * and render DashboardLayout + EmptyState directly.
 *
 * See docs/design/operations-template.md for the full framework spec.
 */
export * from './kpi-row';
export * from './meta-line';
export * from './page-header';
export * from './page-template';
export * from './section-card';
export * from './section-heading';
export * from './table-card';
