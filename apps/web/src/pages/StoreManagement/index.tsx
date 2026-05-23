import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Archive, Pencil, Plus, RefreshCw, Search } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type Column, type Pagination } from '@/components/shared/DataTable';
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

interface Store {
  storeCode: string;
  storeName: string;
  region?: string;
  areaName?: string;
  areaId?: string;
  address?: string | null;
  picName?: string | null;
  phone?: string | null;
  status?: 'active' | 'inactive' | string;
  source?: string;
  id?: string | number;
  [key: string]: unknown;
}

interface StoreFormState {
  storeCode: string;
  storeName: string;
  branchId: string;
  region: string;
  area: string;
  address: string;
  picName: string;
  phone: string;
  isActive: boolean;
}

interface FiltersState {
  areaId: string;
  region: string;
  status: 'active' | 'inactive';
  q: string;
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

const DEFAULT_STORE_FORM: StoreFormState = {
  storeCode: '',
  storeName: '',
  branchId: '2',
  region: '',
  area: '',
  address: '',
  picName: '',
  phone: '',
  isActive: true,
};

const DEFAULT_FILTERS: FiltersState = {
  areaId: '',
  region: '',
  status: 'active',
  q: '',
};

function getBranchLabel(branchId?: string) {
  return (
    BRANCH_OPTIONS.find((branch) => branch.id === String(branchId || ''))?.label || branchId || ''
  );
}

function toStoreForm(store?: Store | null): StoreFormState {
  if (!store) return DEFAULT_STORE_FORM;

  return {
    storeCode: String(store.storeCode || ''),
    storeName: String(store.storeName || ''),
    branchId: String(store.areaId || ''),
    region: String(store.region || ''),
    area: String(store.areaName || ''),
    address: String(store.address || ''),
    picName: String(store.picName || ''),
    phone: String(store.phone || ''),
    isActive: store.status !== 'inactive',
  };
}

const StoreManagement = () => {
  const { api, user } = useAuth();
  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const canManageStores = hasPermission(user, Permissions.STORES_EDIT);

  const [data, setData] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0 });
  const [regionalHeads, setRegionalHeads] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeForm, setStoreForm] = useState<StoreFormState>(DEFAULT_STORE_FORM);
  const [archiveTarget, setArchiveTarget] = useState<Store | null>(null);

  const fetchRegionalHeads = useCallback(async () => {
    try {
      const res = await api.get('/stores/regions');
      if (res.ok) {
        const regionItems = (Array.isArray(res.data) ? res.data : []) as Array<
          string | { name?: string; regionalHead?: string }
        >;
        const values = regionItems
          .map((item: string | { name?: string; regionalHead?: string }): string =>
            typeof item === 'string' ? item : item.name || item.regionalHead || ''
          )
          .filter((value: string): value is string => Boolean(value));
        setRegionalHeads(Array.from(new Set(values)).sort());
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
          status: appliedFilters.status || undefined,
          q: appliedFilters.q || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load stores');
      setData(res.data || []);
      if (res.meta?.pagination) setPagination(res.meta.pagination);
    } catch (err) {
      setError((err as Error).message || 'Failed to load stores');
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

  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }
  ) => {
    const nextFilters = { ...filters, [event.target.name]: event.target.value } as FiltersState;
    setFilters(nextFilters);
    if (event.target.name !== 'q') {
      setAppliedFilters(nextFilters);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters((prev) => {
        if (prev.q === filters.q) return prev;
        return { ...prev, q: filters.q };
      });
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const handleReset = () => {
    const cleared: FiltersState = { q: '', areaId: '', region: '', status: 'active' };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const openCreateDialog = () => {
    setEditingStore(null);
    setStoreForm(DEFAULT_STORE_FORM);
    setFormOpen(true);
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setStoreForm(toStoreForm(store));
    setFormOpen(true);
  };

  const updateForm = (patch: Partial<StoreFormState>) => {
    setStoreForm((prev) => ({ ...prev, ...patch }));
  };

  const blockDemoWrite = () => {
    if (!isDemoUser) return false;
    toast.warning('Demo mode is read-only', {
      description: 'Demo data is generated by the mock API and is not persisted.',
    });
    return true;
  };

  const handleSubmitStore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blockDemoWrite()) return;
    if (!storeForm.storeCode.trim() || !storeForm.storeName.trim() || !storeForm.branchId) {
      toast.error('Store code, name, and branch are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        storeCode: storeForm.storeCode.trim(),
        storeName: storeForm.storeName.trim(),
        branchId: storeForm.branchId,
        area: storeForm.area.trim() || getBranchLabel(storeForm.branchId),
        region: storeForm.region.trim() || undefined,
        address: storeForm.address.trim() || undefined,
        picName: storeForm.picName.trim() || undefined,
        phone: storeForm.phone.trim() || undefined,
        isActive: storeForm.isActive,
      };
      const res = editingStore
        ? await api.put(`/stores/${editingStore.storeCode}`, payload)
        : await api.post('/stores', payload);
      if (!res.ok) throw new Error(res.error?.message || 'Store save failed');

      toast.success(editingStore ? 'Store updated' : 'Store created');
      setFormOpen(false);
      await Promise.all([fetchData(), fetchRegionalHeads()]);
    } catch (err) {
      toast.error('Store save failed', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveStore = async () => {
    if (!archiveTarget || blockDemoWrite()) return;

    setSaving(true);
    try {
      const res = await api.delete(`/stores/${archiveTarget.storeCode}`);
      if (!res.ok) throw new Error(res.error?.message || 'Archive failed');
      toast.success('Store archived');
      setArchiveTarget(null);
      await fetchData();
    } catch (err) {
      toast.error('Archive failed', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/stores/export', {
        params: {
          areaId: appliedFilters.areaId || undefined,
          region: appliedFilters.region || undefined,
          status: appliedFilters.status || undefined,
          q: appliedFilters.q || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Export failed');
      const fileName = downloadWorkbookExport(
        (res.data || {}) as WorkbookExportPayload,
        'stores_export'
      );
      toast.success('Export ready', { description: fileName });
    } catch (err) {
      toast.error('Export failed', { description: (err as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<Column<Store>[]>(() => {
    const tableColumns: Column<Store>[] = [
      {
        header: 'Store Code',
        accessor: 'storeCode',
        className: 'whitespace-nowrap px-4 font-mono text-xs',
        render: (row) => <span className="block min-w-0 truncate">{row.storeCode || '-'}</span>,
      },
      {
        header: 'Name',
        accessor: 'storeName',
        className: 'min-w-[220px] px-4',
        render: (row) => (
          <span className="block min-w-0 max-w-[24rem] truncate font-medium">
            {row.storeName || '-'}
          </span>
        ),
      },
      {
        header: 'Branch',
        accessor: 'areaName',
        className: 'whitespace-nowrap px-4',
        render: (row) => <span>{row.areaName || getBranchLabel(row.areaId) || '-'}</span>,
      },
      {
        header: 'Regional Head',
        accessor: 'region',
        className: 'whitespace-nowrap px-4',
        render: (row) => <span>{row.region || '-'}</span>,
      },
      {
        header: 'PIC',
        accessor: 'picName',
        className: 'hidden px-4 lg:table-cell',
        render: (row) => (
          <span className="block min-w-0 max-w-[14rem] truncate">{row.picName || '-'}</span>
        ),
      },
      {
        header: 'Status',
        accessor: 'status',
        className: 'whitespace-nowrap px-4',
        render: (row) => (
          <Badge variant={row.status === 'inactive' ? 'neutral' : 'success'}>
            {row.status === 'inactive' ? 'Archived' : 'Active'}
          </Badge>
        ),
      },
    ];

    if (canManageStores) {
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
                disabled: row.status === 'inactive',
                onSelect: () => setArchiveTarget(row),
              },
            ]}
          />
        ),
      });
    }

    return tableColumns;
  }, [canManageStores]);

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('store-directory')} />
      <PageHeader
        title="Store Directory"
        subtitle="Monitor operational status and manage canonical store data."
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Badge variant={isDemoMode ? 'info' : 'success'}>
              {isDemoMode ? 'Demo' : 'Production'}
            </Badge>
            {canManageStores && (
              <Button onClick={openCreateDialog}>
                <Plus className="size-4" />
                <span className="truncate">Add Store</span>
              </Button>
            )}
            <ExportButton onClick={handleExport} loading={exporting} />
          </div>
        }
      />
      <Toolbar
        search={
          <SearchBar
            placeholder="Search stores by code or name..."
            name="q"
            value={filters.q}
            onChange={handleFilterChange}
            className="w-full"
          />
        }
        filters={
          <>
            <Select
              value={filters.areaId}
              onValueChange={(value) =>
                handleFilterChange({ target: { name: 'areaId', value: String(value ?? '') } })
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
              value={filters.region}
              onValueChange={(value) =>
                handleFilterChange({ target: { name: 'region', value: String(value ?? '') } })
              }
            >
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue placeholder="All Regional Heads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regional Heads</SelectItem>
                {regionalHeads.map((regionalHead) => (
                  <SelectItem key={regionalHead} value={regionalHead}>
                    {regionalHead}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                handleFilterChange({
                  target: { name: 'status', value: String(value || 'active') },
                })
              }
            >
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Archived</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        actions={
          (filters.q !== '' || filters.areaId !== '' || filters.region !== '' || filters.status !== 'active') && (
            <Button variant="ghost" onClick={handleReset} className="h-10 px-3">
              Reset
            </Button>
          )
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
          keyExtractor={(row) => row.storeCode ?? row.id ?? ''}
        />
      )}

      <EntityFormDialog
        open={formOpen}
        title={editingStore ? 'Edit Store' : 'Add Store'}
        description="Store data is canonical in production and generated in demo mode."
        submitLabel={editingStore ? 'Save Store' : 'Create Store'}
        submitting={saving}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmitStore}
      >
        <EntityFormGrid>
          <EntityField label="Store Code" htmlFor="storeCode" required>
            <Input
              id="storeCode"
              value={storeForm.storeCode}
              onChange={(event) => updateForm({ storeCode: event.target.value })}
              disabled={Boolean(editingStore)}
              className="min-w-0"
            />
          </EntityField>
          <EntityField label="Store Name" htmlFor="storeName" required>
            <Input
              id="storeName"
              value={storeForm.storeName}
              onChange={(event) => updateForm({ storeName: event.target.value })}
              className="min-w-0"
            />
          </EntityField>
          <EntityField label="Branch" required>
            <Select
              value={storeForm.branchId}
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
          <EntityField label="Regional Head" htmlFor="region">
            <Input
              id="region"
              value={storeForm.region}
              onChange={(event) => updateForm({ region: event.target.value })}
            />
          </EntityField>
          <EntityField label="PIC Name" htmlFor="picName">
            <Input
              id="picName"
              value={storeForm.picName}
              onChange={(event) => updateForm({ picName: event.target.value })}
            />
          </EntityField>
          <EntityField label="Contact Number" htmlFor="phone">
            <Input
              id="phone"
              value={storeForm.phone}
              onChange={(event) => updateForm({ phone: event.target.value })}
            />
          </EntityField>
          <EntityField label="Address" htmlFor="address" className="md:col-span-2">
            <Textarea
              id="address"
              value={storeForm.address}
              onChange={(event) => updateForm({ address: event.target.value })}
              className="min-h-24 resize-y"
            />
          </EntityField>
          <EntityField
            label="Active State"
            className="md:col-span-2"
            hint="Turning this off archives the store without deleting it."
          >
            <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-card px-3 py-2">
              <span className="min-w-0 truncate text-sm text-foreground">
                {storeForm.isActive ? 'Active store' : 'Archived store'}
              </span>
              <Switch
                checked={storeForm.isActive}
                onCheckedChange={(checked) => updateForm({ isActive: Boolean(checked) })}
              />
            </div>
          </EntityField>
        </EntityFormGrid>
      </EntityFormDialog>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive store"
        desc={`Archive ${archiveTarget?.storeName || archiveTarget?.storeCode || 'this store'}?`}
        confirmText="Archive"
        danger
        loading={saving}
        onConfirm={handleArchiveStore}
        onClose={() => setArchiveTarget(null)}
      />
    </PageShell>
  );
};

export default StoreManagement;
