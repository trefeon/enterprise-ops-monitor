import React, { useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { SearchBar } from '@/components/shared/SearchBar';
import { BaseSection } from '@/components/base';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { formatTime, formatDate } from '../../lib/date';
import {
  Loader2,
  RefreshCw,
  History,
  AlertTriangle,
} from 'lucide-react';
import { useStoreSync, formatDuration, HISTORY_VIEWS } from './hooks/useStoreSync';
import { StoreSyncSummaryCards, StoreSyncBranchHealth, StoreSyncHistoryDialog } from './components';
import type { Store } from './types';

export default function StoreSync() {
  const { api, user } = useAuth();
  const s = useStoreSync(api, user);

  // ── Table columns ───────────────────────────────────────────
  const storeColumns = useMemo(
    () => [
      {
        header: 'Store Code',
        className: 'w-28 tabular-nums',
        accessor: 'storeCode' as const,
      },
      {
        header: 'Store Name',
        className: 'w-64 text-foreground',
        accessor: 'storeName' as const,
        render: (store: Store) => store.storeName || '-',
      },
      {
        header: 'Branch',
        className: 'w-40 text-muted-foreground',
        accessor: 'branchName' as const,
      },
      {
        header: 'Last Sync',
        className: 'w-44 text-muted-foreground tabular-nums',
        render: (store: Store) => (
          <div>
            <div>{store.lastSyncAt ? formatTime(store.lastSyncAt) : '-'}</div>
            <div className="text-xs">{formatDuration(store.lastSyncAgoSec)}</div>
          </div>
        ),
      },
      {
        header: 'Status',
        className: 'w-28 text-center',
        render: (store: Store) => (
          <StatusBadge
            variant={
              store.isProblem || store.status === 'problem'
                ? 'destructive'
                : store.isStale || store.status === 'stale'
                  ? 'warning'
                  : 'success'
            }
          >
            {store.isProblem || store.status === 'problem'
              ? 'Late'
              : store.isStale || store.status === 'stale'
                ? 'Warning'
                : 'On-time'}
          </StatusBadge>
        ),
      },
      {
        header: '',
        className: 'w-16 text-center',
        render: (store: Store) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              s.openHistory(store.storeCode, store.storeName);
            }}
            aria-label="View history"
            title="View sync history"
          >
            <History aria-hidden="true" className="size-4" />
          </Button>
        ),
      },
    ],
    [s.openHistory]
  );

  const getRowClassName = useCallback((store: Store) => {
    if (store.isProblem || store.status === 'problem') {
      return 'bg-status-error/10 even:bg-status-error/10 hover:bg-status-error/15';
    }
    if (store.isStale || store.status === 'stale') {
      return 'bg-status-warning/5 even:bg-status-warning/5 hover:bg-status-warning/10';
    }
    return 'even:bg-muted/20 hover:bg-muted/30';
  }, []);

  // ── Fatal error state ───────────────────────────────────────
  if (s.fatalError && !s.status && s.stores.length === 0) {
    return (
      <PageShell debugLabel="Store-Sync">
        <EmptyState
          title="Failed to load sync data"
          description={s.fatalError}
          icon={<AlertTriangle className="size-8" />}
          action={
            <Button onClick={s.handleRefresh}>
              <RefreshCw aria-hidden="true" className="mr-2 size-4" /> Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  // ── Normal render ────────────────────────────────────────────
  return (
    <PageShell debugLabel="Store-Sync">
      <FeatureStoryBanner story={getFeatureStory('store-sync')} />

      <PageHeader
        title="Store Sync Monitor"
        description="Real-time store data synchronization status. Stores sync from their computers every ~3 minutes."
        meta={`Updated ${s.updatedLabel} • Auto-refresh ${s.countdown}s${s.sourceMeta ? ` • ${s.sourceMeta}` : ''}`}
        actions={
          <Button onClick={s.handleRefresh}>
            {s.refreshing && <Loader2 aria-hidden="true" className="animate-spin mr-2" />}
            <RefreshCw aria-hidden="true" className="mr-2 size-4" />
            {s.refreshing ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        }
      />

      {/* Error banner */}
      {(s.summaryError || s.statusError || s.storesError) && (
        <Card className="py-3 border-status-warning/30 bg-status-warning/5">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-sm text-foreground">
                {s.summaryError ? `Summary error: ${s.summaryError}` : null}
                {s.summaryError && (s.statusError || s.storesError) ? ' • ' : null}
                {s.statusError ? `Status error: ${s.statusError}` : null}
                {s.statusError && s.storesError ? ' • ' : null}
                {s.storesError ? `Stores error: ${s.storesError}` : null}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => Promise.all([s.fetchSummary(), s.fetchStatus(), s.fetchStores()])}
                >
                  <RefreshCw aria-hidden="true" className="mr-2 size-4" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <StoreSyncSummaryCards
        summary={s.summary}
        status={s.status}
        syncedMaxLabel={s.syncedMaxLabel}
        staleMaxLabel={s.staleMaxLabel}
        statusFilter={s.statusFilter}
        onKpiStatusClick={s.handleKpiStatusClick}
        onTotalStoresClick={s.handleTotalStoresClick}
        onOldestClick={s.handleOldestClick}
        isStatusSelected={s.isStatusSelected}
      />

      {/* Branch Health */}
      {s.status?.branches && s.status.branches.length > 0 && (
        <StoreSyncBranchHealth
          branches={s.status.branches}
          branchFilter={s.branchFilter}
          sourceErrorBranchIds={s.sourceErrorBranchIds}
          onBranchClick={(branchId) => {
            s.setBranchFilter((prev) => (String(prev || '') === branchId ? '' : branchId));
            s.resetPagination();
            s.scrollToStoreTable();
          }}
        />
      )}

      {/* Store Table */}
      <div ref={s.storeTableRef}>
        <BaseSection
          title="Store Sync Status"
          actions={
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex h-11 w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 sm:w-auto">
                <Checkbox
                  id="exclude-bazar"
                  checked={s.excludeBazar}
                  onCheckedChange={(checked) => {
                    s.setExcludeBazar(checked === true);
                    s.setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="shrink-0 rounded border-border bg-transparent text-primary focus:ring-primary/50"
                />
                <label htmlFor="exclude-bazar" className="cursor-pointer">
                  Exclude &gt; 7 days
                </label>
              </div>

              <SearchBar
                placeholder="Search store..."
                value={s.search}
                onValueChange={(val: string) => {
                  s.setSearch(val);
                  s.setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full sm:w-52"
              />

              <div className="flex w-full sm:w-auto items-center gap-2">
                <Select
                  value={s.branchFilter}
                  onValueChange={(val: string | null) => {
                    s.setBranchFilter(val ?? '');
                    s.setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <SelectTrigger className="flex-1 sm:w-40">
                    <SelectValue placeholder="All Branches">
                      {s.branchFilter
                        ? s.branchOptions.find((o) => String(o.value) === String(s.branchFilter))?.label
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Branches</SelectItem>
                    {s.branchOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={s.statusFilter}
                  onValueChange={(val: string | null) => {
                    s.setStatusFilter(val ?? '');
                    s.setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <SelectTrigger className="flex-1 sm:w-40">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="problem">Late (last sync {s.staleMaxLabel}+)</SelectItem>
                    <SelectItem value="stale">
                      Warning ({s.syncedMaxLabel}–{s.staleMaxLabel})
                    </SelectItem>
                    <SelectItem value="synced">On-time (0–{s.syncedMaxLabel})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        >
          <DataTable
            columns={storeColumns}
            data={s.stores}
            loading={s.loadingStores && s.stores.length === 0}
            pagination={{
              page: s.pagination.page,
              pageSize: s.pagination.pageSize,
              total: s.pagination.total || s.stores.length || 0,
            }}
            onPageChange={(page: number) => s.setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(pageSize: number) =>
              s.setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
            }
            onRowClick={(store: Store) => s.openHistory(store.storeCode, store.storeName)}
            rowClassName={getRowClassName}
            keyExtractor={(row: Store) => row.storeCode}
            tableFixed
            emptyState={
              s.storesError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <span className="text-sm text-muted-foreground">
                    Failed to load stores: {s.storesError}
                  </span>
                  <Button variant="secondary" onClick={s.fetchStores} size="sm">
                    <RefreshCw aria-hidden="true" className="mr-2 size-4" />
                    Retry
                  </Button>
                </div>
              ) : (
                'No stores match the current filters.'
              )
            }
          />
        </BaseSection>
      </div>

      {/* History Dialog */}
      <StoreSyncHistoryDialog
        historyStore={s.historyStore}
        historyMode={s.historyMode}
        historyDate={s.historyDate}
        historyRecords={s.historyRecords}
        historyLoading={s.historyLoading}
        historySummary={s.historySummary}
        historyEmptyLabel={s.historyEmptyLabel}
        historyViews={HISTORY_VIEWS}
        onClose={() => s.setHistoryStore(null)}
        onModeChange={(val) => s.setHistoryMode(val)}
        onDateChange={(val) => s.setHistoryDate(val)}
      />
    </PageShell>
  );
}
