import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '@/components/ui/button';
import PageHeader from '../../components/ui/PageHeader';
import PageShell from '../../components/ui/PageShell';
import Toolbar from '../../components/ui/Toolbar';
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
import { AlertTriangle, RefreshCw } from 'lucide-react';

const AREA_OPTIONS = [
  { id: '2', label: 'NORTH HUB' },
  { id: '3', label: 'EAST HUB' },
  { id: '4', label: 'CENTRAL HUB' },
  { id: '5', label: 'COASTAL HUB' },
  { id: '6', label: 'HIGHLAND HUB' },
  { id: '7', label: 'WEST HUB' },
  { id: '8', label: 'RIVER HUB' },
  { id: '9', label: 'SOUTH HUB' },
];
const STORE_EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function base64ToBlob(base64, contentType) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

function normalizeStoreExportFileName(fileName, contentType) {
  const fallbackName = `stores_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;
  const isWorkbook = String(contentType || '').includes('spreadsheetml.sheet');

  if (!isWorkbook) return rawName;
  if (rawName.toLowerCase().endsWith('.xlsx')) return rawName;
  if (rawName.toLowerCase().endsWith('.xls')) return `${rawName.slice(0, -4)}.xlsx`;
  return `${rawName}.xlsx`;
}

const StoreManagement = () => {
  const { api, user } = useAuth();
  const { push } = useToast();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });
  const [regionalHeads, setRegionalHeads] = useState([]);
  const [filters, setFilters] = useState({
    areaId: '',
    region: '',
    q: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    areaId: '',
    region: '',
    q: '',
  });

  const fetchRegionalHeads = useCallback(async () => {
    try {
      const res = await api.get('/stores/regions');
      if (res.ok) {
        setRegionalHeads(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load regions', err);
    }
  }, [api]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/stores', {
        params: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          areaId: appliedFilters.areaId || undefined,
          region: appliedFilters.region || undefined,
          q: appliedFilters.q || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load stores');
      setData(res.data || []);
      if (res.meta?.pagination) setPagination(res.meta.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [api, appliedFilters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchRegionalHeads();
  }, [fetchRegionalHeads]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleSearch = (event) => {
    if (event.key === 'Enter') {
      applyFilters();
    }
  };

  const handleExport = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    try {
      const res = await api.get('/stores/export', {
        params: {
          areaId: appliedFilters.areaId || undefined,
          region: appliedFilters.region || undefined,
          q: appliedFilters.q || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Export failed');
      const exportData = res.data || {};
      const contentType = exportData.contentType || STORE_EXPORT_MIME;
      const isWorkbook = String(contentType).includes('spreadsheetml.sheet');
      const contentBase64 = String(exportData.contentBase64 || exportData.content || '');
      if (isWorkbook && !contentBase64) throw new Error('Export content unavailable');

      const blob = isWorkbook
        ? base64ToBlob(contentBase64, contentType)
        : new Blob([String(exportData.content || '')], { type: contentType || 'text/csv' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = normalizeStoreExportFileName(exportData.fileName, contentType);
      a.click();
      window.URL.revokeObjectURL(url);
      push({ variant: 'success', title: 'Export ready', message: 'Stores Excel downloaded.' });
    } catch (err) {
      push({ variant: 'error', title: 'Export failed', message: err.message });
    }
  };

  const columns = [
    {
      header: 'Store Code',
      accessor: 'storeCode',
      className: 'whitespace-nowrap font-mono text-xs text-left px-4',
      render: (row) => <span>{row.storeCode || '-'}</span>,
    },
    {
      header: 'Name',
      accessor: 'storeName',
      className: 'whitespace-nowrap px-4',
      render: (row) => <span>{row.storeName || '-'}</span>,
    },
    {
      header: 'Regional Head',
      accessor: 'region',
      className: 'whitespace-nowrap px-4',
      render: (row) => <span>{row.region || '-'}</span>,
    },
    {
      header: 'Branch',
      accessor: 'areaName',
      className: 'whitespace-nowrap px-4',
      render: (row) => <span>{row.areaName || '-'}</span>,
    },
  ];

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('store-directory')} />
      <PageHeader
        title="Store Directory"
        subtitle="Monitor operational status and manage store configurations."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <span className="material-symbols-outlined mr-2">download</span>
            Export Excel
          </Button>
        }
      />
      <Toolbar
        left={
          <>
            <SearchBar
              placeholder="Search stores by code or name..."
              name="q"
              value={filters.q}
              onChange={handleFilterChange}
              onKeyDown={handleSearch}
              className="flex-1"
            />
            <div className="flex w-full items-center gap-2 md:w-auto">
              <Select
                value={filters.areaId ? String(filters.areaId) : ''}
                onValueChange={(val) =>
                  handleFilterChange({
                    target: {
                      name: 'areaId',
                      value: val,
                    },
                  })
                }
              >
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="All Branches">
                    {filters.areaId
                      ? `Branch: ${AREA_OPTIONS.find((a) => String(a.id) === String(filters.areaId))?.label || filters.areaId}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Branches</SelectItem>
                  {AREA_OPTIONS.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.region}
                onValueChange={(val) =>
                  handleFilterChange({
                    target: {
                      name: 'region',
                      value: val,
                    },
                  })
                }
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Regional Heads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Regional Heads</SelectItem>
                  {regionalHeads.map((rh) => (
                    <SelectItem key={rh} value={rh}>
                      {rh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
        right={
          <Button variant="secondary" onClick={applyFilters}>
            <span className="material-symbols-outlined mr-2 text-base">search</span>
            Apply
          </Button>
        }
      />
      {error && !loading && data.length === 0 ? (
        <EmptyState
          title="Failed to load stores"
          description={error}
          icon={<AlertTriangle className="size-8" />}
          action={
            <Button onClick={fetchData}>
              <RefreshCw className="mr-2 size-4" /> Retry
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyState="No stores found."
          keyExtractor={(row) => row.storeCode ?? row.id}
        />
      )}
    </PageShell>
  );
};

export default StoreManagement;
