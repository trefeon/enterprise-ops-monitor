import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '@/components/ui/button';
import PageHeader from '../../components/ui/PageHeader';
import PageShell from '../../components/ui/PageShell';
import Toolbar from '../../components/ui/Toolbar';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';

const BRANCH_OPTIONS = [
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

const toCsvValue = (value) => {
  const safeValue = value == null ? '' : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
};

const IdentityCheck = () => {
  const { api, user } = useAuth();
  const { push } = useToast();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0 });
  const [filters, setFilters] = useState({ branchId: '', role: '', q: '' });
  const [appliedFilters, setAppliedFilters] = useState({ branchId: '', role: '', q: '' });
  const [roles, setRoles] = useState([]);

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

  /**
   * @param {{ queryValue?: string, page?: number }} [opts]
   */
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
      setError(err.message || 'Lookup failed');
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

  const handleFilterChange = (event) => {
    const nextFilters = { ...filters, [event.target.name]: event.target.value };
    setFilters(nextFilters);
    if (event.target.name !== 'q') {
      setAppliedFilters(nextFilters);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      applyFilters();
    }
  };

  const handleExport = () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    if (results.length === 0) {
      push({
        variant: 'warning',
        title: 'No data to export',
        message: 'No employee records available to export.',
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

    push({ variant: 'success', title: 'Export ready', message: 'CSV downloaded.' });
  };

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('employee-directory')} />
      <PageHeader
        title="Employee Directory"
        subtitle="Search employees by NIK or name, and review their branch/store assignment."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <span className="material-symbols-outlined mr-2">download</span>
            Export CSV
          </Button>
        }
      />
      <Toolbar
        left={
          <>
            <div className="relative w-full flex-1"><span
                className="absolute left-3 inset-y-0 flex items-center text-muted-foreground material-symbols-outlined text-xl leading-none pointer-events-none">search</span><Input
                placeholder="Search employees by NIK or name..."
                name="q"
                value={filters.q}
                onChange={handleFilterChange}
                onKeyDown={handleSearchKeyDown}
                className="pl-10" /></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:w-96">
              <Select
                value={filters.branchId}
                onValueChange={val => handleFilterChange({
                  target: {
                    value: val
                  }
                })}>
                <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
                <SelectContent><SelectItem value="">All Branches</SelectItem>{BRANCH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}</SelectContent>
              </Select>
              <Select
                value={filters.role}
                onValueChange={val => handleFilterChange({
                  target: {
                    value: val
                  }
                })}>
                <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent><SelectItem value="">All Roles</SelectItem>{roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}</SelectContent>
              </Select>
            </div>
          </>
        }
        right={
          <Button variant="secondary" onClick={applyFilters}>
            <span className="material-symbols-outlined mr-2">search</span>
            Apply
          </Button>
        }
      />
      {error && !loading && results.length === 0 ? (
        <EmptyState
          title="Failed to load employees"
          description={error}
          icon="error"
          action={{ label: 'Retry', icon: 'refresh', onClick: fetchEmployees }}
        />
      ) : (
        <DataTable
          columns={[
            {
              header: 'NIK',
              accessor: 'nik',
              className: 'whitespace-nowrap px-4 font-mono text-xs',
              render: (row) => <span>{row.nik || '-'}</span>,
            },
            {
              header: 'Name',
              accessor: 'fullName',
              className: 'whitespace-nowrap px-4 font-medium',
              render: (row) => <span>{row.fullName || '-'}</span>,
            },
            {
              header: 'Role',
              accessor: 'role',
              className: 'whitespace-nowrap px-4',
              render: (row) => <span>{row.role || '-'}</span>,
            },
            {
              header: 'Store',
              accessor: 'storeName',
              className: 'whitespace-nowrap px-4',
              render: (row) => {
                const storeLabel = [row.storeCode, row.storeName].filter(Boolean).join(' — ');
                return <span>{storeLabel || '-'}</span>;
              },
            },
            {
              header: 'Branch',
              accessor: 'branchName',
              className: 'whitespace-nowrap px-4',
              render: (row) => <span>{row.branchName || row.branchId || '-'}</span>,
            },
          ]}
          data={results}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyState="No employees found."
        />
      )}
    </PageShell>
  );
};

export default IdentityCheck;
