# Enterprise Operations Monitor Frontend PRD

## Product Purpose
Enterprise Operations Monitor is a task-first operations console for retail teams. It shows store EOD completion, sync health, backups, office agents, system health, after-hours activity, identity records, and RBAC management from one dark operational workspace.

## Target Users
- Operations managers who monitor store readiness and resolve blockers.
- IT support users who inspect sync, backups, agents, and system services.
- Admin and super admin users who manage accounts, roles, stores, and employees.
- Demo viewers who need safe read-only portfolio walkthroughs.

## Core User Journeys
- Monitor daily health: open Dashboard, scan KPIs, inspect alerts, move to EOD or Sync.
- Resolve store issue: filter Store Sync or EOD Monitor, inspect row detail, export XLSX if needed.
- Maintain master data: open Store Directory or Employee Directory, filter records, add/edit/archive when permitted.
- Validate infrastructure: open Backups, System, Agent Updater, or Office Agents, inspect status and next action.
- Manage access: open Accounts or Roles, review scoped access, update permissions safely.
- Review after-hours activity: scan summary, filter violations, open monthly report.

## Current UX Problems
- Visual language mixes green-accent dashboard styling, custom glass classes, and shadcn tokens.
- Header gives weak location context and little recovery/action feedback.
- Repeated toolbar, card, empty, loading, and error states vary by page.
- Some sections use nested cards and oversized framed surfaces.
- Tables depend on horizontal scroll unless page-specific responsive columns are configured.
- Icon-only controls sometimes lack tooltips or strong accessible labels.
- Decorative background texture and glow effects compete with operational data.

## Information Architecture
- Primary navigation: Dashboard, Store Sync, EOD Monitor, Store Directory, Employee Directory, Backups, System, After Hours, Agent Updater, Office Agents.
- Admin navigation: Accounts, Roles.
- Support navigation: Portfolio Context, Profile, Logout.
- Page structure: `PageShell` → optional `FeatureStoryBanner` → `PageHeader` → status summary → toolbar → table/detail/action sections.

## Page Requirements
- Dashboard: clear operational health, quick actions, recent alerts, responsive KPI grid.
- EOD Monitor: date/branch/status filters, completion summary, row drilldown, XLSX export.
- Store Sync: status KPIs, right-aligned refresh, collapsible filters, priority status table.
- Store Directory: canonical store list, create/edit/archive actions, demo write block.
- Employee Directory: canonical employee list, create/edit/archive actions, active/inactive filtering.
- Backups: backup inventory, action affordances, empty/error states.
- System: service health, log filtering, export path, readable log severity.
- After Hours: summary KPIs, violation filters, monthly report view.
- Agent Updater: version readiness, monitoring rows, retry/download actions.
- Office Agents: machine status filters, detail drawer, label/edit/download dialogs.
- Accounts/Roles: RBAC tables, safe destructive confirmation, scoped edit flows.
- About/Profile/Login/Live: keep behavior, align to theme, preserve demo clarity.

## Component Inventory
- shadcn primitives: Button, Card, Input, Select, Checkbox, Switch, Tabs, Dialog, Sheet, Dropdown Menu, Tooltip, Popover, Command, Table, Badge, Avatar, Separator, Skeleton, Sonner, Alert, Form, Navigation Menu.
- App components: PageShell, PageHeader, FeatureStoryBanner, Toolbar, SectionCard, StatCard, DataTable, EmptyState, ConfirmDialog, EntityFormDialog, EntityActionMenu, ExportButton, DatePicker, SearchBar.
- New governance components: ResponsiveContainer, SectionHeader, ActionBar, DataToolbar, LoadingState, ErrorState, FormFieldGroup.

## Design-System Requirements
- Dark-only black neutral theme using shadcn semantic tokens.
- Token source of truth: `apps/web/src/index.css` and Tailwind token mapping.
- No loud gradients, decorative blobs, random colors, or one-off inline styles.
- Status colors reserved for actual status: success, warning, destructive, info.
- Radius: 8-10px for surfaces, square cards use `aspect-square`.
- Focus ring visible via `ring` token.

## Responsive Requirements
- Validate widths: 375, 768, 1024, 1440.
- Mobile-first layout with stacked controls and 44px practical touch targets.
- Tables adapt through responsive hidden columns plus card rows on small screens.
- Toolbars use left content + right action lane on desktop, stacked full width on mobile.
- Dialogs and sheets fit viewport and keep scroll inside panel.

## Accessibility Requirements
- Semantic landmarks: header, nav, main, section.
- Inputs have labels or accessible names.
- Icon-only actions need `aria-label`; tooltip used when visible label absent.
- Keyboard focus visible on nav, buttons, menu triggers, dialogs, and rows.
- Use Radix/Base/shadcn focus management for dialog, sheet, popover, menu.
- WCAG 2.2 AA contrast target for foreground, muted text, focus, destructive states.

## Empty, Loading, Error States
- Loading: shadcn Skeleton with `aria-busy` and stable dimensions.
- Empty: clear title, reason, next action if available.
- Error: Alert-like recovery state, retry action, specific message.
- Success/destructive feedback: Sonner toast plus visible state change.

## User Stories
- As ops user, I can scan dashboard health without deciphering decorative UI.
- As IT user, I can filter sync/system data and understand next action.
- As admin, I can edit entities with labelled fields and safe confirmation.
- As demo viewer, I can see realistic data and blocked write feedback.
- As keyboard user, I can navigate shell, tables, dialogs, and actions without mouse.

## Acceptance Criteria
- Shared UI primitives use shadcn components and tokenized styling.
- Main shell communicates location and supports mobile navigation.
- Major sections share page rhythm, toolbar behavior, card density, and state handling.
- Dark neutral theme applies globally through semantic CSS variables.
- No horizontal overflow at required viewport widths in demo route smoke.
- `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web build`, and final `pnpm check:all` pass or exact blockers are documented.

## Success Metrics
- 0 E2E console/page errors on demo route matrix.
- 0 horizontal overflow failures at 375, 768, 1024, 1440.
- Reduced page-local ad hoc control wrappers.
- Consistent toolbar/action placement across route pages.
- Faster visual scanning: page title, primary action, filters, and data table visible in predictable order.

## Out Of Scope
- Backend/API contract changes.
- Auth, RBAC, data fetching, route paths, deployment topology.
- Light mode.
- New animation libraries or large dependencies.
- Production DB schema work.
