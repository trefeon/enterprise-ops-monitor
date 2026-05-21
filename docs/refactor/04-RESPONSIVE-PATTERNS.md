# Responsive Design & Layout Patterns

This document details the responsive design standards, mobile breakpoint behaviors, and class patterns that must be applied across all refactored components and page views.

---

## 1. Breakpoints Reference

The application uses standard Tailwind CSS breakpoints:

| Breakpoint | Minimum Width | Target Layouts |
|---|---|---|
| `xs` (default) | `< 640px` | Portrait Mobile / Small Handhelds |
| `sm` | `640px` | Large Mobile / Vertical Tablets |
| `md` | `768px` | Horizontal Tablets / Small Laptops |
| `lg` | `1024px` | Standard Laptops & Desktops |
| `xl` | `1280px` | Large Desktop Monitors |

---

## 2. Shared Component Responsive Specs

### 2.1 Grid Layouts (StatCard Containers)
Always lay out KPI or status card collections in a grid that adjusts column counts matching viewport size.
**Standard class string**:
```html
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```
- **Mobile (`xs`)**: Stacks vertically (1 column) to preserve text readability.
- **Tablet (`sm` to `md`)**: Spans 2 columns.
- **Desktop (`lg`+)**: Spans 4 columns.

---

### 2.2 Table Responsiveness & Mobile Fallbacks
Tables are highly prone to overflowing horizontally on mobile viewports. The consolidated `DataTable` handles this in two ways:

#### A. Responsive Column Visibility (`hiddenBelow` Spec)
Columns are decorated with `hiddenBelow?: 'sm' | 'md' | 'lg'`. This matches columns to classes dynamically inside `DataTable.tsx`:
```tsx
const getResponsiveClass = (hiddenBelow?: string) => {
  if (hiddenBelow === 'sm') return 'hidden sm:table-cell';
  if (hiddenBelow === 'md') return 'hidden md:table-cell';
  if (hiddenBelow === 'lg') return 'hidden lg:table-cell';
  return '';
};
```
- **High-priority columns** (IDs, Names, Primary Status) must never have `hiddenBelow` specified.
- **Medium-priority columns** (Dates, Action counts) should use `hiddenBelow="sm"` or `hiddenBelow="md"`.
- **Low-priority columns** (Secondary metadata, debug details) should use `hiddenBelow="lg"`.

#### B. Touch Screen Table Scroll Container
Ensure tables are wrapped in an `overflow-x-auto` container to allow manual swiping if table width exceeds screen width:
```html
<div className="w-full overflow-x-auto">
  <Table>...</Table>
</div>
```

---

### 2.3 Dialogs & Modals (`Modal.tsx` & `ConfirmDialog.tsx`)
Modals must adapt to viewport dimensions to ensure usability on smaller devices:
- **Mobile (`xs`)**: Occupy full-screen width or near full-screen width (`w-full` with small margins, e.g. `p-4`), and enable scrollable content areas (`max-h-[85vh] overflow-y-auto`).
- **Tablet/Desktop (`sm`+)**: Enforce bounds using `maxWidth` presets (e.g. `sm:max-w-md`, `sm:max-w-lg`).
- **Action Buttons**: Actions in modal footers should stack vertically on mobile (full width buttons: `w-full`) and align horizontally on desktop (fit width: `sm:w-auto`).

---

### 2.4 Toolbars (`Toolbar.tsx`)
The toolbar acts as a filter/search container on pages.
- **Mobile (`xs`)**: Stacks items vertically (`flex-col gap-3`) so controls like datepickers and search inputs align nicely.
- **Desktop (`md`+)**: Aligns items horizontally (`md:flex-row md:items-center md:justify-between`).

---

## 3. Typography & Text Control

Always protect layout designs from long dynamic database values (such as store names or logs) by applying text wrapping helpers:
- Use `break-words` for identifiers, URLs, or long names to prevent them pushing layout components apart.
- Use `truncate` with `title` attributes on hover for optional cells where overflowing text can be omitted safely.
- Do not let text wrap below its container size without adjusting padding.
