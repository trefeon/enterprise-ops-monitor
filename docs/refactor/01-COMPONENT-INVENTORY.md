# Component Inventory — Current State

Every component in the codebase, with exact source code, props, export style, and usage locations.

---

## 1. Components with BOTH Legacy + Shared Versions (Duplicates)

### 1.1 PageHeader

**Legacy**: `components/ui/PageHeader.jsx` — default export
```jsx
// Props: { title, subtitle, meta?, actions?, className? }
const PageHeader = ({ title, subtitle, meta = null, actions = null, className = '' }) => {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div className="flex flex-col gap-1">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {meta && <div className="page-meta mt-1">{meta}</div>}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
export default PageHeader;
```

**Shared**: `components/shared/PageHeader.tsx` — named export only
```tsx
// Props: { title, description?, meta?, actions?, className? }
// KEY DIFFERENCE: uses `description` instead of `subtitle`
export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) { ... }
```

**Used by** (legacy import `../../components/ui/PageHeader`):
- `StoreManagement/index.jsx`
- `IdentityCheck/index.jsx`
- `AfterHours/index.jsx`
- `Profile/index.jsx`
- `Logout/index.jsx`
- `RolesAdmin/index.jsx`
- `UsersAdmin/index.jsx`

**Used by** (shared import `@/components/shared/PageHeader`):
- `Dashboard/index.tsx`
- `EODMonitor/index.jsx`
- `AgentUpdater/index.jsx`
- `office-agents/index.tsx`

**Migration note**: Pages using `subtitle` prop must change to `description`. Add `subtitle` as alias in shared version OR rename in consumer.

---

### 1.2 DataTable

**Legacy**: `components/ui/DataTable.jsx` — named export `{ DataTable }`
- Exists but only imported by pages that already use the shared version

**Shared**: `components/shared/DataTable.tsx` — named export `{ DataTable }`
```tsx
interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  className?: string;
}
interface Pagination { page: number; pageSize: number; total: number; }
interface DataTableProps<T> {
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
}
```

**Used by** (shared `@/components/shared/DataTable`):
- `Dashboard/index.tsx`
- `StoreManagement/index.jsx`
- `UsersAdmin/index.jsx`
- `IdentityCheck/index.jsx`

**NOT used yet**: EODMonitor, Backups, SystemHealth, StoreSync, AgentUpdater, AfterHours, AfterHoursReport — these all build inline `<Table>` structures.

---

### 1.3 StatCard

**Legacy**: `components/ui/StatCard.jsx` — named export `{ StatCard }`
- Exists but no page imports it anymore

**Shared**: `components/shared/StatCard.tsx` — named export `{ StatCard }`
```tsx
type StatStatus = 'default' | 'success' | 'warning' | 'error' | 'info';
interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  subtext?: ReactNode;
  footer?: ReactNode;
  className?: string;
  accent?: string;
  status?: StatStatus;
  onClick?: () => void;
}
```

**Used by** (all use shared version `@/components/shared/StatCard`):
- Dashboard, EODMonitor, AgentUpdater, AfterHours, AfterHoursReport, office-agents, StoreSync, SystemHealth

---

### 1.4 StatusBadge

**Legacy**: `components/ui/StatusBadge.jsx` — named export
- Exists but no page imports it anymore

**Shared**: `components/shared/StatusBadge.tsx` — named export `{ StatusBadge }`
```tsx
interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'error' | 'destructive' | 'info' | 'neutral' | 'default' | 'secondary' | 'outline';
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  live?: boolean;
}
```

**Used by** (all use shared version):
- Dashboard, EODMonitor, AgentUpdater, AfterHours, AfterHoursReport, StoreSync, SystemHealth, Backups, eodMonitorColumns, storeColumns, backupColumns

---

### 1.5 EmptyState

**Legacy**: `components/ui/EmptyState.jsx` — named export
- Exists but no page imports it anymore

**Shared**: `components/shared/EmptyState.tsx` — named export `{ EmptyState }`
```tsx
interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}
```

**Used by** (all use shared version):
- Dashboard, EODMonitor, AgentUpdater, AfterHours, AfterHoursReport, StoreManagement, IdentityCheck, Backups, StoreSync, SystemHealth

---

## 2. Legacy-ONLY Components (No shared/ version exists yet)

### 2.1 PageShell

**Legacy**: `components/ui/PageShell.jsx` — default export
```jsx
// Props: { children, className? }
export default function PageShell({ children, className = '' }) {
  return <div className={`page-container ${className}`.trim()}>{children}</div>;
}
```

**Used by** (import `../../components/ui/PageShell`):
- Dashboard, EODMonitor, StoreSync, SystemHealth, Backups, AgentUpdater, StoreManagement, UsersAdmin, IdentityCheck, AfterHours, RolesAdmin, Profile, Logout, About, office-agents, PageLoader

---

### 2.2 Modal

**Legacy**: `components/ui/Modal.jsx` — default export
```jsx
// Props: { open, onClose, title, children, className?, maxWidth?, showClose? }
const Modal = ({
  open,
  onClose,
  title,
  children,
  className = '',
  maxWidth = 'max-w-md',
  showClose = true,
}) => { /* uses Dialog primitives */ };
export default Modal;
```

**Used by** (import `../../components/ui/Modal`):
- EODMonitor, AgentUpdater, UsersAdmin, Profile

---

### 2.3 ConfirmDialog

**Legacy**: `components/ui/ConfirmDialog.jsx` — named export `{ ConfirmDialog }`
```jsx
// Props: { open, title, desc, confirmText?, danger?, onConfirm, onClose,
//          confirmValue?, confirmExpected?, onConfirmValueChange?,
//          confirmLabel?, confirmPlaceholder?, confirmHint?, confirmDisabled? }
export function ConfirmDialog({ ... }) { /* uses Dialog primitives */ }
```

**Used by** (import `../../components/ui/ConfirmDialog`):
- EODMonitor, UsersAdmin, Logout, Backups, SystemHealth

---

### 2.4 Toolbar

**Legacy**: `components/ui/Toolbar.jsx` — default export
```jsx
// Props: { left?, right?, children?, className? }
export default function Toolbar({ left = null, right = null, children = null, className = '' }) {
  /* Card wrapper, flex col → row on md */
}
```

**Used by** (import `../../components/ui/Toolbar`):
- StoreManagement, IdentityCheck, AfterHours, AfterHoursReport

---

### 2.5 IconButton

**Legacy**: `components/ui/IconButton.jsx` — both named + default export
```jsx
// Props: { icon, label?, intent?, onClick, className?, disabled?, showDot?, ...restProps }
// intent: 'neutral' | 'primary' | 'danger' | 'ghost'
export const IconButton = ({ icon, label, intent = 'neutral', onClick, ... }) => { ... };
export default IconButton;
```

**Used by** (import from `../../components/ui/IconButton`):
- `columns/eodMonitorColumns.jsx`
- `columns/storeColumns.jsx`
- `columns/backupColumns.jsx`

---

### 2.6 ProgressBar

**Legacy**: `components/ui/ProgressBar.jsx` — default export
```jsx
// Props: { value?, className?, trackClassName?, barClassName? }
export default function ProgressBar({ value = 0, className = '', trackClassName = '', barClassName = '' }) {
  /* Wrapper around shadcn Progress */
}
```

**Used by** (import `../../components/ui/ProgressBar`):
- EODMonitor, StoreSync, SystemHealth, Backups

---

### 2.7 SectionCard

**Legacy**: `components/ui/SectionCard.jsx` — named export `{ SectionCard }`
```jsx
// Props: { title?, subtitle?, right?, children?, className? }
export function SectionCard({ title, subtitle, right, children, className }) {
  /* Card + CardContent wrapper with optional header */
}
```

**Used by** (import `../../components/ui/SectionCard`):
- Profile, Logout

---

### 2.8 IconLink (UNUSED)

**Legacy**: `components/ui/IconLink.jsx` — NOT imported by any file.
**Action**: DELETE.

### 2.9 Divider (UNUSED)

**Legacy**: `components/ui/Divider.jsx` — NOT imported by any file.
**Action**: DELETE.

---

## 3. Shared-ONLY Components (Already modern, minor tweaks needed)

### 3.1 SearchBar

**File**: `components/shared/SearchBar.tsx` — named export `{ SearchBar }`
```tsx
interface SearchBarProps {
  value: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  name?: string;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}
```

**Used by**: Dashboard, EODMonitor, AgentUpdater, StoreManagement, IdentityCheck, AfterHours, AfterHoursReport, office-agents, UsersAdmin

### 3.2 DatePicker

**File**: `components/shared/DatePicker.tsx` — named export `{ DatePicker }`
```tsx
interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
  availableDates?: string[];
}
```

**Used by**: EODMonitor, AfterHours

---

## 4. Components to KEEP in `components/ui/` (shadcn primitives)

These are NOT part of the refactor. Do not modify:

| File | Export |
|------|--------|
| button.tsx | `{ Button }` |
| card.tsx | `{ Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter }` |
| table.tsx | `{ Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableFooter }` |
| dialog.tsx | `{ Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose }` |
| input.tsx | `{ Input }` |
| select.tsx | `{ Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator }` |
| badge.tsx | `{ Badge }` |
| progress.tsx | `{ Progress }` |
| separator.tsx | `{ Separator }` |
| sheet.tsx | `{ Sheet, ... }` |
| skeleton.tsx | `{ Skeleton }` |
| sonner.tsx | `{ Toaster }` |
| Toast.jsx | Global toast handler |
| ToastContext.jsx | Toast provider context |
