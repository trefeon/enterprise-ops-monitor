import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  RotateCw,
  Pause,
  Loader2,
  Download,
  AlertTriangle,
  Clock,
  User,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageTemplate, MetaLine, SectionHeading, TableCard } from '@/components/template';
import { getFeatureStory } from '../../data/stories';
import { formatDate, getWibToday } from '../../lib/date';
import { hasPermission } from '../../lib/auth/permissions';
import { useAuth } from '../../context/AuthContext';
import { useEODMonitor } from './hooks/useEODMonitor';
import { mainTableColumns } from './columns';
import {
  EODStatsRow,
  EODFilters,
  EODSummaryCard,
  EODDetailsModal,
  EODBranchModal,
} from './components';
import type { EODArea, EODStore } from './types';
import { demoBlocked } from '@/components/base/demo-toast';

const AUTO_REFRESH_INTERVAL = 30000;

export default function EODMonitor() {
  const { api, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const eod = useEODMonitor(api, user);

  const handleStatusClick = useCallback(
    (status: string) => {
      const p = new URLSearchParams(searchParams);
      if (status) p.set('status', status);
      else p.delete('status');
      setSearchParams(p);
    },
    [searchParams, setSearchParams]
  );

  const handleBranchPageChange = useCallback(
    (page: number) => {
      if (!eod.branchModal) return;
      eod.setBranchStoresPagination((prev) => ({ ...prev, page }));
      eod.fetchBranchStores(eod.branchModal, page);
    },
    [eod]
  );

  const as = Math.round(AUTO_REFRESH_INTERVAL / 1000);

  return (
    <PageTemplate
      story={getFeatureStory('eod-monitor')}
      title="EOD Monitor"
      subtitle={formatDate(getWibToday())}
      actions={
        <>
          <Button
            variant={eod.autoRefresh ? 'default' : 'secondary'}
            onClick={() => eod.setAutoRefresh((p) => !p)}
          >
            {eod.autoRefresh ? (
              <RefreshCw aria-hidden="true" className="mr-2 size-4 animate-spin" />
            ) : (
              <Pause aria-hidden="true" className="mr-2 size-4" />
            )}
            {eod.autoRefresh ? <span className="tabular">Auto ({as}s)</span> : 'Auto Off'}
          </Button>
          <Button variant="secondary" onClick={eod.handleRefresh}>
            <RotateCw aria-hidden="true" className="mr-2 size-4" /> Refresh
          </Button>
          {(hasPermission(user, 'EOD_SYNC') || eod.isDemoUser) && (
            <Button
              variant="default"
              className={eod.isDemoUser ? 'opacity-60 cursor-not-allowed' : ''}
              onClick={() => {
                if (eod.isDemoUser) {
                  demoBlocked('Unavailable in demo.')
                  return;
                }
                eod.setSyncOpen(true);
              }}
            >
              <RefreshCw aria-hidden="true" className="mr-2 size-4" /> Sync All
            </Button>
          )}
        </>
      }
      meta={[
        <span key="last">
          <Clock aria-hidden="true" className="size-3.5" /> Last:{' '}
          <span className="tabular">{eod.lastUpdatedLabel}</span>
        </span>,
        <span key="user">
          <User aria-hidden="true" className="size-3.5" /> {user?.username || 'Admin'}
        </span>,
        <span key="role">
          <Shield aria-hidden="true" className="size-3.5" />{' '}
          {user?.role ? String(user.role).replace(/_/g, ' ') : 'IT Ops'}
        </span>,
      ]}
    >
      <EODStatsRow
        stats={eod.stats}
        statsLoading={eod.statsLoading}
        statsError={eod.statsError}
        completionRate={eod.completionRate}
        pendingRate={eod.pendingRate}
        onStatusClick={handleStatusClick}
      />

      {!eod.statsLoading && eod.branches.length > 0 && (
        <div className="flex flex-col gap-4">
          <SectionHeading title="Branch Network Health" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {eod.branches.map((b: EODArea) => (
              <EODSummaryCard
                key={b.areaId || b.areaName}
                branch={b}
                onBranchClick={eod.openBranchModal}
              />
            ))}
          </div>
        </div>
      )}

      <TableCard
        toolbar={
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">
              <EODFilters filters={eod.filters} onFilterChange={eod.handleFilterChange} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button variant="secondary" size="sm" onClick={eod.handleExport}>
                {eod.exporting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                <Download aria-hidden="true" className="size-4" />{' '}
                {formatDate(eod.filters.date) ? `Export ${formatDate(eod.filters.date)}` : 'Export'}
              </Button>
              <Button variant="ghost" size="sm" onClick={eod.handleResetFilters}>
                <RotateCw aria-hidden="true" className="size-4" /> Reset
              </Button>
            </div>
          </div>
        }
      >
        {eod.error ? (
          <div className="p-card">
            <EmptyState
              title="Failed to load EOD data"
              description={eod.error}
              icon={<AlertTriangle aria-hidden="true" className="size-8" />}
              action={
                <Button onClick={eod.fetchData}>
                  <RefreshCw aria-hidden="true" className="mr-2 size-4" /> Retry
                </Button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={mainTableColumns}
            data={eod.data}
            loading={eod.loading}
            keyExtractor={(r: EODStore) => r.storeId}
            onRowClick={eod.openDetail}
            pagination={eod.pagination}
            onPageChange={(p: number) => eod.setPagination((prev) => ({ ...prev, page: p }))}
            onPageSizeChange={(s: number) =>
              eod.setPagination((prev) => ({ ...prev, page: 1, pageSize: s }))
            }
            pageSizeOptions={[10, 20, 50, 100]}
            emptyState={
              <div className="text-center text-muted-foreground py-8">
                No results. Adjust filters.
              </div>
            }
            noCard
          />
        )}
      </TableCard>

      <EODDetailsModal
        detail={eod.detail}
        loading={eod.detailLoading}
        error={eod.detailError}
        onClose={() => eod.setDetail(null)}
      />

      <ConfirmDialog
        open={eod.syncOpen}
        title="Sync all stores"
        desc="Queue EOD sync for every active store."
        confirmText="Queue Sync"
        onConfirm={eod.handleSync}
        onClose={() => eod.setSyncOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(eod.retryTarget)}
        title="Retry EOD"
        desc={eod.retryTarget ? `Retry EOD for ${eod.retryTarget.storeCode}?` : ''}
        confirmText="Retry"
        onConfirm={eod.handleRetry}
        onClose={() => eod.setRetryTarget(null)}
      />

      <EODBranchModal
        branch={eod.branchModal}
        stores={eod.branchStores}
        loading={eod.branchStoresLoading}
        pagination={eod.branchStoresPagination}
        onPageChange={handleBranchPageChange}
        onClose={eod.closeBranchModal}
      />
    </PageTemplate>
  );
}
