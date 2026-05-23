import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RefreshCw, RotateCw, Pause, Loader2, Download, AlertTriangle,
  Clock, User, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { Toolbar } from '@/components/shared/Toolbar';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { formatDate } from '../../lib/date';
import { hasPermission } from '../../lib/auth/permissions';
import { useAuth } from '../../context/AuthContext';
import { useEODMonitor } from './hooks/useEODMonitor';
import { mainTableColumns } from './columns';
import { EODStatsRow, EODFilters, EODSummaryCard, EODDetailsModal, EODBranchModal } from './components';
import type { EODArea, EODStore } from './types';

const AUTO_REFRESH_INTERVAL = 30000;

export default function EODMonitor() {
  const { api, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const eod = useEODMonitor(api, user);

  const handleStatusClick = useCallback(
    (status: string) => {
      const p = new URLSearchParams(searchParams);
      if (status) p.set('status', status); else p.delete('status');
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

  const badgeClass = 'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 py-1 px-3 text-xs text-muted-foreground font-medium';
  const as = Math.round(AUTO_REFRESH_INTERVAL / 1000);

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('eod-monitor')} />
      <PageHeader
        title="EOD Monitor"
        subtitle="Real-time EOD status by store."
        meta={
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={badgeClass}><Clock className="size-3.5" /> Last: {eod.lastUpdatedLabel}</span>
            <span className={badgeClass}><User className="size-3.5" /> {user?.username || 'Admin'}</span>
            <span className={badgeClass}><Shield className="size-3.5" /> {user?.role ? String(user.role).replace(/_/g, ' ') : 'IT Ops'}</span>
          </div>
        }
        actions={
          <>
            <Button variant={eod.autoRefresh ? 'default' : 'secondary'} onClick={() => eod.setAutoRefresh((p) => !p)}>
              {eod.autoRefresh ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Pause className="mr-2 size-4" />}
              {eod.autoRefresh ? `Auto (${as}s)` : 'Auto Off'}
            </Button>
            <Button variant="secondary" onClick={eod.handleRefresh}><RotateCw className="mr-2 size-4" /> Refresh</Button>
            {(hasPermission(user, 'EOD_SYNC') || eod.isDemoUser) && (
              <Button
                variant="default"
                className={eod.isDemoUser ? 'opacity-60 cursor-not-allowed' : ''}
                onClick={() => {
                  if (eod.isDemoUser) { toast.warning('Demo', { description: 'Unavailable in demo.' }); return; }
                  eod.setSyncOpen(true);
                }}
              >
                <RefreshCw className="mr-2 size-4" /> Sync All
              </Button>
            )}
          </>
        }
      />

      <EODStatsRow stats={eod.stats} statsLoading={eod.statsLoading} statsError={eod.statsError}
        completionRate={eod.completionRate} pendingRate={eod.pendingRate} onStatusClick={handleStatusClick} />

      {!eod.statsLoading && eod.branches.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="section-title">Branch Network Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-section">
            {eod.branches.map((b: EODArea) => (
              <EODSummaryCard key={b.areaId || b.areaName} branch={b} onBranchClick={eod.openBranchModal} />
            ))}
          </div>
        </div>
      )}

      <Toolbar
        left={<EODFilters filters={eod.filters} onFilterChange={eod.handleFilterChange} />}
        right={
          <>
            <Button variant="secondary" size="sm" onClick={eod.handleExport}>
              {eod.exporting && <Loader2 className="size-4 animate-spin" />}
              <Download className="size-4" /> {formatDate(eod.filters.date) ? `Export ${formatDate(eod.filters.date)}` : 'Export'}
            </Button>
            <Button variant="ghost" size="sm" onClick={eod.handleResetFilters}>
              <RotateCw className="size-4" /> Reset
            </Button>
          </>
        }
      />

      <Card className="p-0 overflow-hidden flex min-h-80 flex-col">
        <CardContent className="p-0">
          {eod.error ? (
            <div className="p-card">
              <EmptyState title="Failed to load EOD data" description={eod.error}
                icon={<AlertTriangle className="size-8" />}
                action={<Button onClick={eod.fetchData}><RefreshCw className="mr-2 size-4" /> Retry</Button>} />
            </div>
          ) : (
            <DataTable columns={mainTableColumns} data={eod.data} loading={eod.loading}
              keyExtractor={(r: EODStore) => r.storeId} onRowClick={eod.openDetail}
              pagination={eod.pagination}
              onPageChange={(p: number) => eod.setPagination((prev) => ({ ...prev, page: p }))}
              onPageSizeChange={(s: number) => eod.setPagination((prev) => ({ ...prev, page: 1, pageSize: s }))}
              pageSizeOptions={[10, 20, 50, 100]}
              emptyState={<div className="text-center text-muted-foreground py-8">No results. Adjust filters.</div>} noCard />
          )}
        </CardContent>
      </Card>

      <EODDetailsModal detail={eod.detail} loading={eod.detailLoading} error={eod.detailError} onClose={() => eod.setDetail(null)} />

      <ConfirmDialog open={eod.syncOpen} title="Sync all stores" desc="Queue EOD sync for every active store."
        confirmText="Queue Sync" onConfirm={eod.handleSync} onClose={() => eod.setSyncOpen(false)} />

      <ConfirmDialog open={Boolean(eod.retryTarget)} title="Retry EOD"
        desc={eod.retryTarget ? `Retry EOD for ${eod.retryTarget.storeCode}?` : ''}
        confirmText="Retry" onConfirm={eod.handleRetry} onClose={() => eod.setRetryTarget(null)} />

      <EODBranchModal branch={eod.branchModal} stores={eod.branchStores} loading={eod.branchStoresLoading}
        pagination={eod.branchStoresPagination} onPageChange={handleBranchPageChange} onClose={eod.closeBranchModal} />
    </PageShell>
  );
}
