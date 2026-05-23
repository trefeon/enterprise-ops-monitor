import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Archive, Pencil, Plus, RefreshCw, Search } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityActionMenu } from '@/components/shared/EntityActionMenu';
import {
  EntityField,
  EntityFormDialog,
  EntityFormGrid,
} from '@/components/shared/EntityFormDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShell } from '@/components/shared/PageShell';
import { SearchBar } from '@/components/shared/SearchBar';
import { Toolbar } from '@/components/shared/Toolbar';
import { downloadWorkbookExport, type WorkbookExportPayload } from '@/lib/api/downloadExport';
import { isDemoMode } from '@/lib/appMode';
import { hasPermission, Permissions } from '@/lib/auth/permissions.js';

interface BranchOption {
  id: string;
  label: string;
}

interface Employee {
  nik: string;
  empid?: string;
  fullName: string;
  name?: string;
  role: string;
  jobName?: string;
  storeCode?: string;
  storeName?: string;
  branchName?: string;
  branchId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  [key: string]: unknown;
}

interface EmployeeFormState {
  nik: string;
  fullName: string;
  role: string;
  branchId: string;
  storeCode: string;
  storeName: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface FiltersState {
  branchId: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  q: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

const BRANCH_OPTIONS: BranchOption[] = [
  { id: '2', label: 'NORTH HUB' },
  { id: '3', label: 'EAST HUB' },
  { id: '4', label: 'CENTRAL HUB' },
  { id: '5', label: 'COASTAL HUB' },
  { id: '6', label: 'HIGHLAND HUB' },
  { id: '7', label: 'WEST HUB' },
  { id: '8', label: 'RIVER HUB' },
  { id: '9', label: 'SOUTH HUB' },
];

const PAGE_SIZE = 20;
const DEFAULT_FILTERS: FiltersState = { branchId: '', role: '', status: 'ACTIVE', q: '' };
const DEFAULT_EMPLOYEE_FORM: EmployeeFormState = {
  nik: '',
  fullName: '',
  role: '',
  branchId: '2',
  storeCode: '',
  storeName: '',
  status: 'ACTIVE',
};

function getEmployeeNik(employee: Employee) {
  return String(employee.nik || employee.empid || '');
}

function getEmployeeName(employee: Employee) {
  return String(employee.fullName || employee.name || '');
}

function getEmployeeRole(employee: Employee) {
  return String(employee.role || employee.jobName || '');
}

function toEmployeeForm(employee?: Employee | null): EmployeeFormState {
  if (!employee) return DEFAULT_EMPLOYEE_FORM;

  return {
    nik: getEmployeeNik(employee),
    fullName: getEmployeeName(employee),
    role: getEmployeeRole(employee),
    branchId: String(employee.branchId || '2'),
    storeCode: String(employee.storeCode || ''),
    storeName: String(employee.storeName || ''),
    status: employee.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
}

const IdentityCheck = () => {
  const { api, user } = useAuth();
  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const canManageEmployees = hasPermission(user, Permissions.EMPLOYEES_EDIT);

  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [roles, setRoles] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(DEFAULT_EMPLOYEE_FORM);
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/employees/roles');
      if (res.ok) {
        const values = (res.data || []).map((role: string | { name?: string }) =>
          typeof role === 'string' ? role : role.name || ''
        );
        setRoles(values.filter((role: string): role is string => Boolean(role)));
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  }, [api]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/employees', {
        params: {
          query: appliedFilters.q?.trim() || undefined,
          branchId: appliedFilters.branchId || undefined,
          role: appliedFilters.role || undefined,
          status: appliedFilters.status || undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Lookup failed');
      setResults(res.data || []);
      if (res.meta?.pagination) setPagination(res.meta.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [
    api,
    appliedFilters.branchId,
    appliedFilters.role,
    appliedFilters.status,
    appliedFilters.q,
    pagination.page,
    pagination.pageSize,
  ]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleFilterChange = (target: { name: string; value: string }) => {
    const nextFilters = { ...filters, [target.name]: target.value } as FiltersState;
    setFilters(nextFilters);
    if (target.name !== 'q') {
      setAppliedFilters(nextFilters);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') applyFilters();
  };

  const updateForm = (patch: Partial<EmployeeFormState>) => {
    setEmployeeForm((prev) => ({ ...prev, ...patch }));
  };

  const openCreateDialog = () => {
    setEditingEmployee(null);
    setEmployeeForm(DEFAULT_EMPLOYEE_FORM);
    setFormOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm(toEmployeeForm(employee));
    setFormOpen(true);
  };

  const blockDemoWrite = () => {
    if (!isDemoUser) return false;
    toast.warning('Demo mode is read-only', {
      description: 'Demo employee data is generated by the mock API and is not persisted.',
    });
    return true;
  };

  const handleSubmitEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blockDemoWrite()) return;
    if (!employeeForm.nik.trim() || !employeeForm.fullName.trim() || !employeeForm.branchId) {
      toast.error('NIK, full name, and branch are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nik: employeeForm.nik.trim(),
        fullName: employeeForm.fullName.trim(),
        role: employeeForm.role.trim() || undefined,
        branchId: employeeForm.branchId,
        storeCode: employeeForm.storeCode.trim() || undefined,
        storeName: employeeForm.storeName.trim() || undefined,
        status: employeeForm.status,
      };
      const res = editingEmployee
        ? await api.put(`/employees/${getEmployeeNik(editingEmployee)}`, payload)
        : await api.post('/employees', payload);
      if (!res.ok) throw new Error(res.error?.message || 'Employee save failed');

      toast.success(editingEmployee ? 'Employee updated' : 'Employee created');
      setFormOpen(false);
      await Promise.all([fetchEmployees(), fetchRoles()]);
    } catch (err) {
      toast.error('Employee save failed', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveEmployee = async () => {
    if (!archiveTarget || blockDemoWrite()) return;

    setSaving(true);
    try {
      const res = await api.delete(`/employees/${getEmployeeNik(archiveTarget)}`);
      if (!res.ok) throw new Error(res.error?.message || 'Archive failed');
      toast.success('Employee archived');
      setArchiveTarget(null);
      await fetchEmployees();
    } catch (err) {
      toast.error('Archive failed', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/employees/export', {
        params: {
          query: appliedFilters.q?.trim() || undefined,
          branchId: appliedFilters.branchId || undefined,
          role: appliedFilters.role || undefined,
          status: appliedFilters.status || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Export failed');
      const fileName = downloadWorkbookExport(
        (res.data || {}) as WorkbookExportPayload,
        'employee_directory'
      );
      toast.success('Export ready', { description: fileName });
    } catch (err) {
      toast.error('Export failed', { description: (err as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<Column<Employee>[]>(() => {
    const tableColumns: Column<Employee>[] = [
      {
        header: 'NIK',
        accessor: 'nik',
        className: 'whitespace-nowrap px-4 font-mono text-xs',
        render: (row) => <span>{getEmployeeNik(row) || '-'}</span>,
      },
      {
        header: 'Name',
        accessor: 'fullName',
        className: 'min-w-[220px] px-4 font-medium',
        render: (row) => (
          <span className="block min-w-0 max-w-[24rem] truncate">
            {getEmployeeName(row) || '-'}
          </span>
        ),
      },
      {
        header: 'Role',
        accessor: 'role',
        className: 'whitespace-nowrap px-4',
        render: (row) => <span>{getEmployeeRole(row) || '-'}</span>,
      },
      {
        header: 'Store',
        accessor: 'storeName',
        className: 'min-w-[220px] px-4',
        render: (row) => {
          const storeLabel = [row.storeCode, row.storeName].filter(Boolean).join(' - ');
          return <span className="block min-w-0 max-w-[24rem] truncate">{storeLabel || '-'}</span>;
        },
      },
      {
        header: 'Branch',
        accessor: 'branchName',
        className: 'whitespace-nowrap px-4',
        render: (row) => <span>{row.branchName || row.branchId || '-'}</span>,
      },
      {
        header: 'Status',
        accessor: 'status',
        className: 'whitespace-nowrap px-4',
        render: (row) => (
          <Badge variant={row.status === 'INACTIVE' ? 'neutral' : 'success'}>
            {row.status === 'INACTIVE' ? 'Archived' : 'Active'}
          </Badge>
        ),
      },
    ];

    if (canManageEmployees) {
      tableColumns.push({
        header: '',
        className: 'w-12 px-3 text-right',
        render: (row) => (
          <EntityActionMenu
            actions={[
              {
                label: 'Edit',
                icon: <Pencil className="size-4" />,
                onSelect: () => openEditDialog(row),
              },
              {
                label: 'Archive',
                icon: <Archive className="size-4" />,
                variant: 'destructive',
                disabled: row.status === 'INACTIVE',
                onSelect: () => setArchiveTarget(row),
              },
            ]}
          />
        ),
      });
    }

    return tableColumns;
  }, [canManageEmployees]);

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('employee-directory')} />
      <PageHeader
        title="Employee Directory"
        subtitle="Search employees and manage canonical production employee data."
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Badge variant={isDemoMode ? 'info' : 'success'}>
              {isDemoMode ? 'Demo' : 'Production'}
            </Badge>
            {canManageEmployees && (
              <Button onClick={openCreateDialog}>
                <Plus className="size-4" />
                <span className="truncate">Add Employee</span>
              </Button>
            )}
            <ExportButton onClick={handleExport} loading={exporting} />
          </div>
        }
      />
      <Toolbar
        left={
          <>
            <SearchBar
              placeholder="Search employees by NIK or name..."
              name="q"
              value={filters.q}
              onChange={(event) => handleFilterChange(event.target)}
              onKeyDown={handleSearchKeyDown}
              containerClassName="sm:col-span-2 lg:col-span-1 lg:w-72 xl:w-80"
              className="w-full"
            />
            <Select
              value={filters.branchId}
              onValueChange={(value) =>
                handleFilterChange({ name: 'branchId', value: String(value ?? '') })
              }
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Branches</SelectItem>
                {BRANCH_OPTIONS.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.role}
              onValueChange={(value) =>
                handleFilterChange({ name: 'role', value: String(value ?? '') })
              }
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                handleFilterChange({ name: 'status', value: String(value || 'ACTIVE') })
              }
            >
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Archived</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        right={
          <Button variant="secondary" onClick={applyFilters}>
            <Search className="size-4" />
            Apply
          </Button>
        }
      />
      {error && !loading && results.length === 0 ? (
        <EmptyState
          title="Failed to load employees"
          description={error}
          icon={<AlertTriangle className="size-8" />}
          action={
            <Button onClick={fetchEmployees}>
              <RefreshCw className="mr-2 size-4" /> Retry
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={results}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyState="No employees found."
          keyExtractor={(row) => getEmployeeNik(row)}
        />
      )}

      <EntityFormDialog
        open={formOpen}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        description="Employee records are manually maintained in production and generated in demo mode."
        submitLabel={editingEmployee ? 'Save Employee' : 'Create Employee'}
        submitting={saving}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmitEmployee}
      >
        <EntityFormGrid>
          <EntityField label="NIK" htmlFor="nik" required>
            <Input
              id="nik"
              value={employeeForm.nik}
              disabled={Boolean(editingEmployee)}
              onChange={(event) => updateForm({ nik: event.target.value })}
            />
          </EntityField>
          <EntityField label="Full Name" htmlFor="fullName" required>
            <Input
              id="fullName"
              value={employeeForm.fullName}
              onChange={(event) => updateForm({ fullName: event.target.value })}
            />
          </EntityField>
          <EntityField label="Role" htmlFor="role">
            <Input
              id="role"
              value={employeeForm.role}
              list="employee-role-options"
              onChange={(event) => updateForm({ role: event.target.value })}
            />
            <datalist id="employee-role-options">
              {roles.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
          </EntityField>
          <EntityField label="Branch" required>
            <Select
              value={employeeForm.branchId}
              onValueChange={(value) => updateForm({ branchId: value || '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {BRANCH_OPTIONS.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EntityField>
          <EntityField label="Store Code" htmlFor="storeCode">
            <Input
              id="storeCode"
              value={employeeForm.storeCode}
              onChange={(event) => updateForm({ storeCode: event.target.value })}
            />
          </EntityField>
          <EntityField label="Store Name" htmlFor="storeName">
            <Input
              id="storeName"
              value={employeeForm.storeName}
              onChange={(event) => updateForm({ storeName: event.target.value })}
            />
          </EntityField>
          <EntityField label="Status">
            <Select
              value={employeeForm.status}
              onValueChange={(value) =>
                updateForm({ status: value === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Archived</SelectItem>
              </SelectContent>
            </Select>
          </EntityField>
        </EntityFormGrid>
      </EntityFormDialog>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive employee"
        desc={`Archive ${archiveTarget ? getEmployeeName(archiveTarget) || getEmployeeNik(archiveTarget) : 'this employee'}?`}
        confirmText="Archive"
        danger
        loading={saving}
        onConfirm={handleArchiveEmployee}
        onClose={() => setArchiveTarget(null)}
      />
    </PageShell>
  );
};

export default IdentityCheck;
