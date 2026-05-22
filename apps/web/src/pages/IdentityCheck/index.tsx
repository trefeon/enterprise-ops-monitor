import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShell } from '@/components/shared/PageShell';
import { Toolbar } from '@/components/shared/Toolbar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { SearchBar } from '@/components/shared/SearchBar';
import { getFeatureStory } from '../../data/stories';
import { AlertTriangle, Download, RefreshCw, Search } from 'lucide-react';

interface BranchOption {
  id: string;
  label: string;
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

interface Employee {
  nik: string;
  fullName: string;
  role: string;
  storeCode?: string;
  storeName?: string;
  branchName?: string;
  branchId?: string;
}

interface FiltersState {
  branchId: string;
  role: string;
  q: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface ApiResponseMeta {
  pagination?: PaginationState;
}

const toCsvValue = (value: unknown): string => {
  const safeValue = value == null ? '' : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
};

const IdentityCheck = () => {
  const { api, user } = useAuth();

  const isDemoUser = Boolean(
    user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo'
  );
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });
  const [filters, setFilters] = useState<FiltersState>({
    branchId: '',
    role: '',
    q: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>({
    branchId: '',
    role: '',
    q: '',
  });
  const [roles, setRoles] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/nik/roles');
      if (res.ok) {
        setRoles(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  }, [api]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/nik/list', {
        params: {
          query: appliedFilters.q?.trim() || undefined,
          branchId: appliedFilters.branchId || undefined,
          role: appliedFilters.role || undefined,
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

  const handleFilterChange = (
    eventOrVal:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } }
  ) => {
    const target =
      'nativeEvent' in eventOrVal
        ? (eventOrVal as React.ChangeEvent<HTMLInputElement>).target
        : (eventOrVal as { target: { name: string; value: string } }).target;

    const nextFilters = { ...filters, [target.name]: target.value };
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

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') {
      applyFilters();
    }
  };

  const handleExport = () => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    if (results.length === 0) {
      toast.warning('No data to export', {
        description: 'No employee records available to export.',
      });
      return;
    }

    const headers = ['NIK', 'Employee Name', 'Role', 'Store Code', 'Store Name', 'Branch'];

    const rows = results.map((row) => [
      row.nik,
      row.fullName,
      row.role,
      row.storeCode,
      row.storeName,
      row.branchName || row.branchId,
    ]);

    const csvLines = [
      headers.map((header) => toCsvValue(header)).join(','),
      ...rows.map((row) => row.map((value) => toCsvValue(value)).join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Export ready', { description: 'CSV downloaded.' });
  };

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('employee-directory')} />
      <PageHeader
        title="Employee Directory"
        subtitle="Search employees by NIK or name, and review their branch/store assignment."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />
      <Toolbar
        left={
          <>
            <SearchBar
              placeholder="Search employees by NIK or name..."
              name="q"
              value={filters.q}
              onChange={handleFilterChange}
              onKeyDown={handleSearchKeyDown}
              className="flex-1"
            />
            <div className="flex w-full items-center gap-2 md:w-auto">
              <Select
                value={filters.branchId ? String(filters.branchId) : ''}
                onValueChange={(val) =>
                  handleFilterChange({
                    target: {
                      name: 'branchId',
                      value: val,
                    },
                  })
                }
              >
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="All Branches">
                    {filters.branchId
                      ? `Branch: ${BRANCH_OPTIONS.find((b) => String(b.id) === String(filters.branchId))?.label || filters.branchId}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Branches</SelectItem>
                  {BRANCH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.role}
                onValueChange={(val) =>
                  handleFilterChange({
                    target: {
                      name: 'role',
                      value: val,
                    },
                  })
                }
              >
                <SelectTrigger className="w-full md:w-48">
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
            </div>
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
          columns={[
            {
              header: 'NIK',
              accessor: 'nik',
              className: 'whitespace-nowrap px-4 font-mono text-xs',
              render: (row: Employee) => <span>{row.nik || '-'}</span>,
            },
            {
              header: 'Name',
              accessor: 'fullName',
              className: 'whitespace-nowrap px-4 font-medium',
              render: (row: Employee) => <span>{row.fullName || '-'}</span>,
            },
            {
              header: 'Role',
              accessor: 'role',
              className: 'whitespace-nowrap px-4',
              render: (row: Employee) => <span>{row.role || '-'}</span>,
            },
            {
              header: 'Store',
              accessor: 'storeName',
              className: 'whitespace-nowrap px-4',
              render: (row: Employee) => {
                const storeLabel = [row.storeCode, row.storeName].filter(Boolean).join(' — ');
                return <span>{storeLabel || '-'}</span>;
              },
            },
            {
              header: 'Branch',
              accessor: 'branchName',
              className: 'whitespace-nowrap px-4',
              render: (row: Employee) => <span>{row.branchName || row.branchId || '-'}</span>,
            },
          ]}
          data={results}
          loading={loading}
          pagination={pagination}
          onPageChange={(page: number) => setPagination((prev) => ({ ...prev, page }))}
          emptyState="No employees found."
          keyExtractor={(row: Employee) => row.nik}
        />
      )}
    </PageShell>
  );
};

export default IdentityCheck;
