# Component Specifications (TypeScript Targets)

This document provides the exact TypeScript interfaces and implementation specifications for both the enhanced existing shared components and the new shared components.

---

## 1. Phase 1: Enhanced Shared Components

All existing shared components live in `apps/web/src/components/shared/`.

### 1.1 DataTable.tsx

Consolidate legacy pagination and features. Add mobile-responsive card view fallback.

```tsx
import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  className?: string;
  /** Responsive column visibility: hides the column under this breakpoint */
  hiddenBelow?: 'sm' | 'md' | 'lg';
  /** Enable column sorting if provided */
  sortable?: boolean;
  sortKey?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  keyExtractor: (row: T) => string | number;
  tableFixed?: boolean;
  noCard?: boolean;
  className?: string;
  /** Sticky table header for scrollable containers */
  stickyHeader?: boolean;
  /** Support for changing pageSize options */
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  /** Custom sort state */
  sortBy?: string;
  sortDesc?: boolean;
  onSort?: (key: string, desc: boolean) => void;
}

export function DataTable<T>(props: DataTableProps<T>): React.JSX.Element;
```

#### Key Implementation Requirements:
1. **Mobile Card Fallback**: On `xs` (under `640px`) screens, if mobile viewport is detected, hide the `<Table>` element and instead render data as a vertical list of cards. Each card renders columns as `Label: Value` pairs.
2. **Column Visibility**: Apply `hidden` classes dynamically based on `column.hiddenBelow` (e.g., `column.hiddenBelow === 'md'` maps to `hidden md:table-cell`).
3. **Sort Indicators**: If a column has `sortable: true`, render a click handler on the header with sorting icons (e.g. `ArrowUpDown`, `ArrowUp`, or `ArrowDown` from `lucide-react`).
4. **Skeleton State**: Instead of a generic loading spinner spinner inside a single row, render `5` rows of animated `<Skeleton>` components matching the column structure when `loading` is true.

---

### 1.2 StatCard.tsx

Add density options, KPI trends, and loading skeletons.

```tsx
import type { ReactNode } from 'react';

export type StatStatus = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  subtext?: ReactNode;
  footer?: ReactNode;
  className?: string;
  accent?: string;
  status?: StatStatus;
  onClick?: () => void;
  /** Card size / padding density */
  size?: 'sm' | 'default' | 'lg';
  /** Shows loading skeleton state */
  loading?: boolean;
  /** Displays a trend indicator */
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    label?: string;
  };
}

export function StatCard(props: StatCardProps): React.JSX.Element;
```

#### Key Implementation Requirements:
1. **Loading State**: When `loading === true`, render skeletons for the title, value, and subtext.
2. **Sizes**: 
   - `sm`: padding `p-3`, title `text-[10px]`, value `text-xl`
   - `default`: padding `p-5`, title `text-xs`, value `text-[1.75rem]`
   - `lg`: padding `p-6`, title `text-sm`, value `text-3xl`
3. **Trend Component**: Display trend values with colored icons matching direction:
   - `up`: `TrendingUp` icon (green text if positive indicator)
   - `down`: `TrendingDown` icon (red text if negative indicator)
   - `flat`: `MoveRight` or horizontal indicator

---

### 1.3 StatusBadge.tsx

Unify JSX and TSX badge mapping.

```tsx
import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'destructive'
  | 'info'
  | 'neutral'
  | 'default'
  | 'secondary'
  | 'outline';

export interface StatusBadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  live?: boolean;
  /** Toggle visibility of the bullet status dot */
  dot?: boolean;
}

export function StatusBadge(props: StatusBadgeProps): React.JSX.Element;
```

#### Key Implementation Requirements:
1. **Bullet Dot**: The status dot should be visible by default (`dot = true`). Add capability to hide the dot when `dot = false`.
2. **Variants**: Ensure all variant styling matches the semantic mapping (using Tailwind classes like `bg-status-success/10 text-status-success border-status-success/15`).

---

### 1.4 EmptyState.tsx

Add compatibility for legacy button formats and size modes.

```tsx
import type { ReactNode } from 'react';

export interface LegacyAction {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  /** Accepts standard React node or legacy action object */
  action?: ReactNode | LegacyAction;
  className?: string;
  /** Compact padding for small card/table views */
  compact?: boolean;
}

export function EmptyState(props: EmptyStateProps): React.JSX.Element;
```

#### Key Implementation Requirements:
1. **Legacy Action Normalization**: If `action` is passed as an object matching `{ onClick, label, icon }`, automatically instantiate a custom `Button` component internally displaying the `icon` and `label` and triggering the `onClick`.
2. **Compact View**: If `compact === true`, reduce vertical padding from `py-16` to `py-8` and reduce title size.

---

### 1.5 PageHeader.tsx

```tsx
import type { ReactNode } from 'react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  /** Legacy code uses subtitle, modern uses description. Map both. */
  description?: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Optional breadcrumbs list */
  breadcrumbs?: Breadcrumb[];
}

export function PageHeader(props: PageHeaderProps): React.JSX.Element;
```

#### Key Implementation Requirements:
1. **Subtitle Alias**: Render `description || subtitle` inside the subtitle paragraph.
2. **Breadcrumbs**: If `breadcrumbs` are provided, render a breadcrumb trail above the title (using custom flex/chevron separators or shadcn `Breadcrumb` elements).

---

### 1.6 SearchBar.tsx & DatePicker.tsx

Minimal changes to support toolbar size synchronization.

```tsx
// SearchBarProps additions
interface SearchBarProps {
  // ... existing props
  size?: 'sm' | 'default';
}

// DatePickerProps additions
interface DatePickerProps {
  // ... existing props
  size?: 'sm' | 'default';
}
```

---

## 2. Phase 2: New Shared TSX Components

Create these brand-new components in `apps/web/src/components/shared/`. Each component must support BOTH named exports and default exports to maintain compatibility with legacy default imports.

### 2.1 SectionCard.tsx

```tsx
import type { ReactNode } from 'react';

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard(props: SectionCardProps): React.JSX.Element;
export default SectionCard;
```

---

### 2.2 Modal.tsx

```tsx
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  maxWidth?: 'max-w-xs' | 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
  showClose?: boolean;
}

export function Modal(props: ModalProps): React.JSX.Element;
export default Modal;
```

#### Key Implementation Requirements:
1. **Base Primitive**: Wrap shadcn's `<Dialog>` and `<DialogContent>` primitives.
2. **Close Button Control**: Ensure `showClose` dynamically toggles the visibility of the absolute close button inside `DialogContent`.

---

### 2.3 ConfirmDialog.tsx

```tsx
import type { ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  desc?: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  confirmValue?: string;
  confirmExpected?: string | null;
  onConfirmValueChange?: ((val: string) => void) | null;
  confirmLabel?: string;
  confirmPlaceholder?: string;
  confirmHint?: ReactNode;
  confirmDisabled?: boolean;
  /** Shows dynamic loading state on the confirmation button */
  loading?: boolean;
}

export function ConfirmDialog(props: ConfirmDialogProps): React.JSX.Element;
export default ConfirmDialog;
```

---

### 2.4 Toolbar.tsx

```tsx
import type { ReactNode } from 'react';

export interface ToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Toolbar(props: ToolbarProps): React.JSX.Element;
export default Toolbar;
```

#### Key Implementation Requirements:
1. **Responsive Flex**: On mobile screens (`< 768px`), stack elements vertically (`flex-col w-full`). On larger screens (`md`), layout horizontally (`flex-row justify-between`).

---

### 2.5 IconButton.tsx

```tsx
import type { ReactNode, ButtonHTMLAttributes } from 'react';

export type IconButtonIntent = 'neutral' | 'primary' | 'danger' | 'ghost';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label?: string;
  intent?: IconButtonIntent;
  showDot?: boolean;
}

export function IconButton(props: IconButtonProps): React.JSX.Element;
export default IconButton;
```

#### Key Implementation Requirements:
1. **Touch Targets**: Standardize min dimensions at `h-10 w-10` to satisfy the minimum `44px` physical tap target rule on touch screens.

---

### 2.6 ProgressBar.tsx

```tsx
export interface ProgressBarProps {
  value?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

export function ProgressBar(props: ProgressBarProps): React.JSX.Element;
export default ProgressBar;
```

#### Key Implementation Requirements:
1. **Base Primitive**: Wrap shadcn's `<Progress>` primitive, transferring `className`, `trackClassName`, and `indicatorClassName` props.
