# Component Migration Guide

This guide details the import updates, prop adjustments, and legacy file cleanups required to transition the application fully to the consolidated TSX shared component set.

---

## 1. Import Paths Mapping

All consumers must update their import paths:

| Legacy Import Source | Target Import Source | Named or Default |
|---|---|---|
| `../../components/ui/PageHeader` | `@/components/shared/PageHeader` | Named `PageHeader` |
| `../../components/ui/DataTable` | `@/components/shared/DataTable` | Named `DataTable` |
| `../../components/ui/StatCard` | `@/components/shared/StatCard` | Named `StatCard` |
| `../../components/ui/StatusBadge` | `@/components/shared/StatusBadge` | Named `StatusBadge` |
| `../../components/ui/EmptyState` | `@/components/shared/EmptyState` | Named `EmptyState` |
| `../../components/ui/PageShell` | `@/components/shared/PageShell` | Named/Default `PageShell` |
| `../../components/ui/SectionCard` | `@/components/shared/SectionCard` | Named/Default `SectionCard` |
| `../../components/ui/Modal` | `@/components/shared/Modal` | Named/Default `Modal` |
| `../../components/ui/ConfirmDialog` | `@/components/shared/ConfirmDialog` | Named/Default `ConfirmDialog` |
| `../../components/ui/Toolbar` | `@/components/shared/Toolbar` | Named/Default `Toolbar` |
| `../../components/ui/IconButton` | `@/components/shared/IconButton` | Named/Default `IconButton` |
| `../../components/ui/ProgressBar` | `@/components/shared/ProgressBar` | Named/Default `ProgressBar` |

---

## 2. Prop Translation Matrix

Adjust props in consumer files during migration:

### 2.1 PageHeader
- Legacy: `<PageHeader subtitle="My description" />`
- Target: `<PageHeader description="My description" />` (or use the `subtitle` alias if implemented)

### 2.2 StatusBadge
- Legacy variants `'error'` must be translated or mapped internally to `'destructive'`.
- StatusBadge defaults to showing status dots; hide them if needed via `dot={false}`.

### 2.3 EmptyState
- Legacy: `<EmptyState action={{ onClick, label, icon }} />`
- Target: `<EmptyState action={<Button onClick={onClick}>{icon}{label}</Button>} />` or let `EmptyState` auto-render via type-narrowing legacy object signatures.

---

## 3. Consumer Migration Checklist

Complete the migration page by page. Ensure all page files under `apps/web/src/views/` and column files under `apps/web/src/views/columns/` or helper scripts are processed.

### 3.1 Dashboard (`Dashboard/index.tsx`)
- [ ] Migrate `PageHeader` import to `@/components/shared/PageHeader`
- [ ] Migrate `StatCard` import to `@/components/shared/StatCard`
- [ ] Migrate `StatusBadge` import to `@/components/shared/StatusBadge`
- [ ] Migrate `DataTable` import to `@/components/shared/DataTable`
- [ ] Migrate `EmptyState` import to `@/components/shared/EmptyState`
- [ ] Migrate `PageShell` import to `@/components/shared/PageShell`

### 3.2 EOD Monitor (`EODMonitor/index.jsx`)
- [ ] Migrate `PageHeader`, `Toolbar`, `IconButton`, `ProgressBar`, `PageShell`, `Modal`, `StatCard`, `StatusBadge`, `SearchBar`, `DatePicker`, `ConfirmDialog` imports
- [ ] Replace custom inline main table structure with `<DataTable>`
- [ ] Replace custom inline branch modal table structure with `<DataTable>`

### 3.3 Store Sync (`StoreSync/index.jsx`)
- [ ] Migrate `PageHeader`, `StatCard`, `StatusBadge`, `ProgressBar`, `EmptyState`, `Modal`, `PageShell`, `SearchBar` imports
- [ ] Replace custom inline store sync status list/table with `<DataTable>`

### 3.4 System Health (`SystemHealth/index.jsx`)
- [ ] Migrate `PageHeader`, `ProgressBar`, `StatusBadge`, `EmptyState`, `PageShell`, `ConfirmDialog` imports
- [ ] Replace custom inline system/health check logs table with `<DataTable>`

### 3.5 Backups (`Backups/index.jsx`)
- [ ] Migrate `StatusBadge`, `ProgressBar`, `EmptyState`, `IconButton`, `PageShell`, `ConfirmDialog` imports
- [ ] Replace custom inline backup list table with `<DataTable>`

### 3.6 Office Agents (`office-agents/index.tsx`)
- [ ] Migrate `PageHeader`, `StatCard`, `SearchBar`, `PageShell` imports

### 3.7 Agent Updater (`AgentUpdater/index.jsx`)
- [ ] Migrate `PageHeader`, `StatCard`, `StatusBadge`, `EmptyState`, `Modal`, `PageShell` imports

### 3.8 Store Management (`StoreManagement/index.jsx`)
- [ ] Migrate `PageHeader`, `DataTable`, `Toolbar`, `EmptyState`, `PageShell` imports

### 3.9 Users Admin (`UsersAdmin/index.jsx`)
- [ ] Migrate `PageHeader`, `DataTable`, `Modal`, `ConfirmDialog`, `PageShell` imports

### 3.10 Identity Check (`IdentityCheck/index.jsx`)
- [ ] Migrate `DataTable`, `Toolbar`, `EmptyState`, `PageShell` imports

### 3.11 After Hours & After Hours Report (`AfterHours/index.jsx` & `AfterHoursReport/index.jsx`)
- [ ] Migrate `PageHeader`, `Toolbar`, `StatCard`, `StatusBadge`, `EmptyState`, `PageShell`, `ConfirmDialog` imports

### 3.12 Columns & Helper Files
- [ ] `columns/eodMonitorColumns.jsx`: Migrate `StatusBadge`, `IconButton`
- [ ] `columns/storeColumns.jsx`: Migrate `StatusBadge`, `IconButton`
- [ ] `columns/backupColumns.jsx`: Migrate `StatusBadge`, `IconButton`
- [ ] `PageLoader.jsx`: Migrate `PageShell`

---

## 4. Phase 4: Delete Legacy Files

Verify zero remaining references via:
```bash
grep -rn "components/ui/\(DataTable\|StatCard\|StatusBadge\|EmptyState\|PageHeader\|SectionCard\|Modal\|ConfirmDialog\|Toolbar\|IconButton\|IconLink\|ProgressBar\|PageShell\|Divider\)" apps/web/src/
```

Once confirmed clean, execute the file removal:
```bash
rm apps/web/src/components/ui/DataTable.jsx
rm apps/web/src/components/ui/StatCard.jsx
rm apps/web/src/components/ui/StatusBadge.jsx
rm apps/web/src/components/ui/EmptyState.jsx
rm apps/web/src/components/ui/PageHeader.jsx
rm apps/web/src/components/ui/SectionCard.jsx
rm apps/web/src/components/ui/Modal.jsx
rm apps/web/src/components/ui/ConfirmDialog.jsx
rm apps/web/src/components/ui/Toolbar.jsx
rm apps/web/src/components/ui/IconButton.jsx
rm apps/web/src/components/ui/IconLink.jsx
rm apps/web/src/components/ui/ProgressBar.jsx
rm apps/web/src/components/ui/PageShell.jsx
rm apps/web/src/components/ui/Divider.jsx
```
