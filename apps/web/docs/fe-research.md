# Frontend Research Summary — Enterprise Ops Monitor

> Phase 1 output for frontend rework
> Date: 2026-05-22

---

## 1A — GitHub Reference Repos

### ✅ satnaing/shadcn-admin (12.1k ★, MIT)

- **URL:** https://github.com/satnaing/shadcn-admin
- **Stack:** Vite + React + TypeScript + TanStack Router + shadcn/ui + TailwindCSS
- **Status:** Active (v2.2.1, Nov 2025)
- **License:** MIT ✅
- **What to adopt:**
  - Sidebar component pattern (collapsible, responsive)
  - Dashboard layout grid pattern
  - Global search command (Cmd+K)
  - Page routing structure
  - Dark/light mode toggle pattern
- **What to skip:** TanStack Router (we use react-router-dom 7), RTL support, Clerk auth

### ✅ shadcn/ui Taxonomy (19.2k ★, MIT — **ARCHIVED**)

- **URL:** https://github.com/shadcn-ui/taxonomy
- **Status:** ⚠️ Archived — uses Next.js 13 deprecated patterns
- **What NOT to adopt:** It's Next.js-specific and archived. Only use as design reference.

### ✅ shadcn/ui Official Examples

- **URL:** https://ui.shadcn.com/docs/components
- **What to adopt:**
  - [Data Table](https://ui.shadcn.com/docs/components/radix/data-table) — TanStack Table integration
  - [Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) — Official component, better than our custom one
  - [Form](https://ui.shadcn.com/docs/forms/react-hook-form) — RHF + Zod integration
  - [Sonner](https://ui.shadcn.com/docs/components/radix/sonner) — Already installed, replace our custom Toast

### 🟢 TanStack Table (TanStack, MIT)

- **URL:** https://tanstack.com/table/latest
- **Status:** Active, stable v8
- **What to adopt:** Use as the base for DataTable refactor
- **Features from shadcn tutorial:** Sorting, filtering, pagination, row selection, column visibility

### 🟢 marmelab/shadcn-admin-kit (Open Source)

- **URL:** https://marmelab.com/shadcn-admin-kit/
- **What to check:** Pre-built admin blocks (datagrid, list, form, etc.)

---

## 1B — Best Practices

### Tables

- **TanStack Table + shadcn <Table>** = production standard
- **Pattern:** Column definitions as typed objects → pass to `useReactTable()` → render with `flexRender()`
- **Key features:** Client-side sort/filter/paginate by default, server-side mode via props
- **Mobile:** Collapse to card layout (already partially done in current DataTable)
- **Export:** Use API-provided XLSX workbook payloads via the shared export helper

### Cards

- **Pattern:** Variants = StatCard, ListCard, DetailCard, ActionCard, EmptyCard
- Each card needs: title, description, loading skeleton, error state
- Use shadcn `<Card>` as base, compose with `<CardHeader>`, `<CardContent>`, `<CardFooter>`
- StatCard with trend arrow (up/down/flat) = standard pattern

### Forms

- **Stack:** react-hook-form + Zod + shadcn `<Form>` components
- **Pattern:** `<FormField>` wrapper with label + input + error message
- **SearchInput:** Debounced (300ms) + clear button
- **FilterBar:** Row of filter chips/selects

### Sidebar

- **Official shadcn Sidebar component** — composable, themeable, collapsible
- **Pattern:** AppShell wrapping `<SidebarProvider>` + `<Sidebar>` + `<SidebarInset>` (main content)
- **Mobile:** Sheet-based sidebar (already partially done)
- **Collapsible modes:** Icon, Full, Off-canvas

### Modal/Dialog

- Use shadcn `<Dialog>` for modals (already done for Modal.tsx and ConfirmDialog.tsx)
- **ConfirmDialog pattern:** Type-to-confirm for destructive actions

### Toast

- **Use Sonner** — already installed (`ui/sonner.tsx`), replace custom `Toast.jsx`
- Migration: Import `toast` from `sonner`, call `toast.success()`, `toast.error()`, etc.
- Remove `ToastContext.jsx` after migration

### Animation

- **tailwindcss-animate** already configured (via `tw-animate-css`)
- **framer-motion** for page transitions (already used in PageTransition)
- **Pattern:** `fade-in`, `slide-in-from-bottom`, `scale-in`, `stagger-children`
- **Always respect** `prefers-reduced-motion` (already done in `index.css`)

---

## 1C — TweakCN Theme Check

- **URL:** https://tweakcn.com/editor/theme
- **State as of check:** Shows default shadcn theme
- **Available theme types:**
  - Color palettes (Primary, Background, Foreground, Secondary, Accent, Muted, Destructive, Border, Ring)
  - Sidebar theme colors
  - Chart colors (5 levels)
- **What we can customize:** Color scheme, border radius, fonts
- **Our current theme:** Already has custom green-accent dark theme with all tokens in `index.css`
- **Recommendation:** Our existing dark theme is already solid — mostly green accent (primary=#4ade80), proper contrast hierarchy. Minor tweaks could be:
  - Keeping our border radii (`--radius-lg: 10px`) as they are
  - Sidebar theme tokens if we adopt official shadcn Sidebar component

---

## 1D — Key Decisions for This Rework

| Area                       | Decision                                                                | Rationale                                                                         |
| -------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Table**                  | TanStack Table v8 + shadcn                                              | Industry standard, flexible, well-documented                                      |
| **Forms**                  | react-hook-form + Zod + shadcn Form                                     | Official shadcn recommendation                                                    |
| **Sidebar**                | Keep current custom (improve) or adopt official shadcn Sidebar          | Official sidebar needs review — may need to match our collapsible + sheet pattern |
| **Toast**                  | Migrate to Sonner, remove Toast.jsx + ToastContext.jsx                  | Already installed, sonner is more accessible                                      |
| **Theme**                  | Keep current dark theme, extract tokens to TypeScript                   | Our theme is already solid with green accent                                      |
| **Animation**              | Keep framer-motion for page, tailwindcss-animate for micro-interactions | Already works well                                                                |
| **TypeScript**             | Migrate all .jsx → .tsx                                                 | Strict typing, better DX                                                          |
| **Component architecture** | Atomic design (atoms → molecules → organisms → pages)                   | Maintainable at scale                                                             |
