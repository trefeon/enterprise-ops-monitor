# Refactor Verification Plan

This document details the verification and validation checks that must be executed to ensure the refactored codebase is stable, type-safe, and free of regression issues.

---

## 1. Automated Checks & Commands

Run these commands from the root directory of the repository to confirm syntactic correctness:

### 1.1 TypeScript Validation
Confirm that the new TSX components and updated pages typecheck cleanly:
```bash
pnpm typecheck
```
*Expected result: Command completes with code 0. No typescript errors.*

### 1.2 Linting & Formatting
Verify that all import lines conform to standards and no dead variables are left behind:
```bash
pnpm lint
```
*Expected result: No lint violations in target files. If warnings occur, run `pnpm format:write` first.*

### 1.3 Production Builds
Ensure Vite can resolve the new imports, compile the TSX components, and package the static assets:
```bash
pnpm build
```
*Expected result: Bundle builds successfully in the `apps/web/dist` target.*

### 1.4 Test Suite
Ensure the existing unit/integration test suite continues to pass:
```bash
pnpm -r test
```
*Expected result: All tests pass successfully.*

---

## 2. Codebase Reference Verification

Confirm that all consumer pages have successfully migrated to the new shared paths. No file imports should reference legacy paths for consolidated components.

Run this grep command to scan for invalid imports:
```bash
grep -rn "components/ui/\(DataTable\|StatCard\|StatusBadge\|EmptyState\|PageHeader\|SectionCard\|Modal\|ConfirmDialog\|Toolbar\|IconButton\|IconLink\|ProgressBar\|PageShell\|Divider\)" apps/web/src/
```
*Expected result: Zero output. If lines are returned, those imports must be updated to `@/components/shared/`.*

---

## 3. Manual UI Verification Protocol

Launch the local development server:
```bash
pnpm dev
```

Complete the following checks inside the browser:

### 3.1 Layout & Visual Regression Checklist
- [ ] Navigate to `/dashboard` and check that headers, cards, and data tables load with their top semantic status rails intact.
- [ ] Navigate to `/eod-monitor` and check the date selector, search bars, and table render without alignment gaps.
- [ ] Inspect status badges on all pages. Verify they render their status dots correctly and display proper colors.
- [ ] Confirm page descriptions render underneath titles where subtitles were previously used.

### 3.2 Interaction Checks
- [ ] Open the detail modal on `/eod-monitor` by clicking a branch row. Verify that close buttons and click-out zones close the modal.
- [ ] Trigger an EOD sync trigger action. Confirm that the verification/warning confirm dialog prompts correctly, respects custom input verification matching if specified, and behaves properly on click.
- [ ] Test the data table pagination: click the next/previous controls, alter page sizes (where enabled), and verify records update.

### 3.3 Mobile Responsiveness Tests
Use Chrome or Firefox DevTools device simulator (`Ctrl+Shift+M` or `Cmd+Shift+M`) to verify:
- [ ] **Viewport 375px (Mobile)**:
  - All sidebars toggle off or collapse into a responsive layout.
  - Data tables activate their scroll viewports or transition into stackable card lists.
  - Modals stretch to occupy full screen bounds.
  - Grid structures resize to a single vertical column stack.
- [ ] **Viewport 768px (Tablet)**:
  - Toolbars stack neatly.
  - Card grids expand to two columns.
- [ ] **Viewport 1024px+ (Desktop)**:
  - Full wide grids are displayed (4 columns).
  - All columns in tables are fully visible.
