import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '@/components/ui/button';
import Modal from '../../components/ui/Modal';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDateTime } from '../../lib/date';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import PageShell from '../../components/ui/PageShell';
import { StatCard } from '@/components/shared/StatCard';
import { SearchBar } from '@/components/shared/SearchBar';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import {
  Loader2,
  RefreshCw,
  Download,
  UploadCloud,
  CheckCircle2,
  Monitor,
  Zap,
  History,
  Search,
  AlertCircle,
  Trash2,
  FileUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function base64ToBlob(base64, contentType) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

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

function getNodeStatus(node, currentVersion) {
  if (!node.last_check_at) return 'uninstalled';

  const status = node.agent_status;
  if (status && status !== 'unknown') {
    if (status === 'checking') return 'checking';
    if (status === 'downloading') return 'downloading';
    if (status === 'updating') return 'updating';
    if (status === 'up_to_date') return 'synced';
    if (status === 'error') return 'error';
    if (status === 'need_update') return 'outdated';
  }

  if (node.last_error) return 'error';
  if (node.version === currentVersion) return 'synced';
  return 'outdated';
}

function getStatusBadge(status) {
  switch (status) {
    case 'synced':
      return <StatusBadge variant="success">Up to Date</StatusBadge>;
    case 'outdated':
      return <StatusBadge variant="warning">Need Update</StatusBadge>;
    case 'checking':
      return (
        <StatusBadge variant="default" className="bg-primary/20 text-primary">
          Checking
        </StatusBadge>
      );
    case 'downloading':
      return (
        <StatusBadge variant="default" className="bg-status-info/20 text-status-info">
          Downloading
        </StatusBadge>
      );
    case 'updating':
      return (
        <StatusBadge variant="default" className="bg-status-info/20 text-status-info">
          Updating
        </StatusBadge>
      );
    case 'error':
      return <StatusBadge variant="destructive">Error</StatusBadge>;
    case 'uninstalled':
      return <StatusBadge variant="secondary">Not Installed</StatusBadge>;
    default:
      return <StatusBadge variant="outline">Unknown</StatusBadge>;
  }
}

const AgentUpdater = () => {
  const { api, user } = useAuth();
  const { push } = useToast();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';

  const [monitoring, setMonitoring] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [suggestedVersion, setSuggestedVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [regionalHeads, setRegionalHeads] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState(0);

  const [filters, setFilters] = useState({
    areaId: '',
    region: '',
    q: '',
  });

  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  const handleRefresh = () => {
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (filters.areaId) query.set('areaId', filters.areaId);
      if (filters.region) query.set('region', filters.region);
      if (filters.q) query.set('q', filters.q);

      const monitoringRes = await api.get(`/agent/monitoring?${query.toString()}`);
      if (monitoringRes.ok) {
        const rows = Array.isArray(monitoringRes.data) ? monitoringRes.data : [];
        setMonitoring(rows);
        setActiveDownloads(monitoringRes.meta?.activeDownloads || 0);

        const rhSet = new Set(
          rows
            .map((node) => node.regional_head || node.regional)
            .filter((rh) => rh && rh.toLowerCase() !== 'unknown')
        );
        setRegionalHeads([...rhSet].sort());
      } else {
        setError(monitoringRes.error?.message || 'Failed to fetch agent monitoring');
      }

      const versionRes = await api.get('/agent/suggest-version');
      if (versionRes.ok) {
        setCurrentVersion(versionRes.data.current);
        setSuggestedVersion(versionRes.data.suggested || versionRes.data.current);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.areaId, filters.region]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchData();
  };

  const applyFilters = () => {
    fetchData();
  };

  const handleDeleteAgent = async (storeId) => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    if (
      !confirm(
        `Are you sure you want to reset the agent record for store ${storeId}? This will mark it as Not Installed.`
      )
    )
      return;

    try {
      const res = await api.delete(`/agent/monitoring/${storeId}`);
      if (res.ok) {
        push({
          variant: 'success',
          title: 'Deleted',
          message: `Agent record for ${storeId} reset.`,
        });
        fetchData();
      } else {
        push({
          variant: 'error',
          title: 'Delete Failed',
          message: res.error?.message || 'Unknown error',
        });
      }
    } catch (err) {
      console.error(err);
      push({ variant: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  const handleDownloadSetup = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    try {
      const authHeader = api.defaults.headers.common.Authorization;
      const res = await fetch('/api/agent/setup-script', {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Setup_Agent_Update.bat';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      push({ variant: 'success', title: 'Downloaded', message: 'Setup script downloaded.' });
    } catch {
      push({
        variant: 'error',
        title: 'Download Failed',
        message: 'Could not download setup script.',
      });
    }
  };

  const handleExportExcel = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    setExporting(true);
    try {
      const res = await api.get('/agent/monitoring/export');
      if (!res.ok) throw new Error(res.error?.message || 'Failed to export report');

      const exportData = res.data || {};
      const contentBase64 = String(exportData.contentBase64 || '');
      if (!contentBase64) throw new Error('Export content unavailable');

      const blob = base64ToBlob(
        contentBase64,
        exportData.contentType ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = exportData.fileName || 'agent_updater_report.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);

      push({
        variant: 'success',
        title: 'Export ready',
        message: 'Agent report exported to Excel.',
      });
    } catch (err) {
      push({
        variant: 'error',
        title: 'Export failed',
        message: err?.message || 'Failed to export report',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleOpenDeployModal = () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    setVersion(suggestedVersion || currentVersion || '');
    setDeployModalOpen(true);
  };

  const handleDeploy = async (e) => {
    e.preventDefault();

    if (!file || !version) {
      push({
        variant: 'warning',
        title: 'Validation Error',
        message: 'Please select a file and provide a version.',
      });
      return;
    }

    setIsDeploying(true);
    try {
      const formData = new FormData();
      formData.append('publisher', file);
      formData.append('version', version);

      const res = await api.post('/agent/upload', formData, {
        headers: { 'Content-Type': undefined },
        timeout: 300000,
      });

      if (!res.ok) throw new Error(res.error?.message || 'Deployment failed');

      push({
        variant: 'success',
        title: 'Version Deployed',
        message: `Successfully updated to ${version}`,
      });

      setDeployModalOpen(false);
      setFile(null);
      setVersion('');
      fetchData();
    } catch (err) {
      push({ variant: 'error', title: 'Deployment Failed', message: err.message });
    } finally {
      setIsDeploying(false);
    }
  };

  if (error && !loading && monitoring.length === 0) {
    return (
      <PageShell>
        <EmptyState
          title="Error Loading Agent Data"
          description={error}
          icon={<AlertCircle className="size-8" />}
          action={
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 size-4" />
              Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  const installedAgents = monitoring.filter((node) => node.last_check_at);
  const metricsLoading = loading && monitoring.length === 0;

  const publisherSyncedCount = installedAgents.filter(
    (node) => node.version === currentVersion
  ).length;
  const publisherOutdatedCount = installedAgents.length - publisherSyncedCount;
  const publisherRawPercent =
    installedAgents.length === 0 ? 0 : (publisherSyncedCount / installedAgents.length) * 100;
  const publisherSyncedPercent =
    installedAgents.length === 0
      ? '0%'
      : publisherOutdatedCount > 0
        ? `${Math.floor(publisherRawPercent)}%`
        : '100%';

  const runningPublisherCount = installedAgents.filter(
    (node) => getNodeStatus(node, currentVersion) === 'synced'
  ).length;
  const nonModernWorkers = installedAgents.filter((node) => {
    const workerVersion = Number.parseInt(node.worker_version, 10);
    return !node.worker_version || Number.isNaN(workerVersion) || workerVersion < 4;
  }).length;

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('agent-updater')} />
      <PageHeader
        title="Agent Updater"
        description="One-way update flow: worker checks server version, downloads publisher if outdated, then replaces and restarts DemoAgentPublisher.exe."
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={cn('mr-2 size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="w-full sm:w-auto"
            >
              {exporting ? (
                <Loader2 className="animate-spin mr-2 size-4" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Export Excel
            </Button>
            <Button variant="outline" onClick={handleDownloadSetup} className="w-full sm:w-auto">
              <Download className="mr-2 size-4" />
              Setup Script
            </Button>
            <Button onClick={handleOpenDeployModal} className="w-full sm:w-auto">
              <UploadCloud className="mr-2 size-4" />
              Deploy Update
            </Button>
          </>
        }
      />
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Deployed Version"
          value={metricsLoading ? '...' : currentVersion || 'None'}
          icon={<CheckCircle2 className="size-5" />}
          status={currentVersion ? 'success' : 'default'}
        />

        <StatCard
          title="Active Nodes"
          value={metricsLoading ? '--' : installedAgents.length}
          icon={<Monitor className="size-5" />}
          subtext={
            <div className="flex justify-between items-center w-full">
              <span>{runningPublisherCount} node(s) synced</span>
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-bold live-text-3xs uppercase tracking-widest flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  {activeDownloads > 0 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  )}
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                {activeDownloads}/10 DLs
              </span>
            </div>
          }
        />

        <StatCard
          title="Publisher Sync"
          value={metricsLoading ? '--' : publisherSyncedPercent}
          icon={<Zap className="size-5" />}
          status={publisherOutdatedCount === 0 ? 'success' : 'warning'}
          subtext={
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sync Progress</span>
              <StatusBadge
                variant={
                  metricsLoading || installedAgents.length === 0
                    ? 'secondary'
                    : publisherOutdatedCount === 0
                      ? 'success'
                      : 'warning'
                }
                className="h-4 live-text-3xs font-bold"
              >
                {metricsLoading
                  ? 'Loading'
                  : installedAgents.length === 0
                    ? 'No Agents'
                    : publisherOutdatedCount === 0
                      ? 'Synced'
                      : `${publisherOutdatedCount} Outdated`}
              </StatusBadge>
            </div>
          }
        />

        <StatCard
          title="Legacy Worker Scripts"
          value={metricsLoading ? '--' : nonModernWorkers}
          icon={<History className="size-5" />}
          status={nonModernWorkers > 0 ? 'warning' : 'default'}
          subtext="Setup script required for non-modern workers"
        />
      </section>

      <section className="grid grid-cols-1 gap-2 md:flex md:flex-wrap md:items-center md:gap-3 py-4">
        <SearchBar
          placeholder="Search by store code or name..."
          name="q"
          value={filters.q}
          onChange={handleFilterChange}
          onKeyDown={handleSearch}
          className="flex-1"
        />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={filters.areaId}
            onValueChange={(val) =>
              handleFilterChange({
                target: {
                  name: 'areaId',
                  value: val,
                },
              })
            }
          >
            <SelectTrigger className="w-full md:w-40 h-11">
              <SelectValue placeholder="All Branches">
                {filters.areaId
                  ? AREA_OPTIONS.find((a) => a.id === String(filters.areaId))?.label
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
            <SelectTrigger className="w-full md:w-48 h-11">
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
        <Button variant="secondary" onClick={applyFilters} className="w-full md:w-auto h-11">
          <Search className="mr-2 size-4" />
          Apply
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight uppercase">Deployment Monitoring</h2>
          {publisherOutdatedCount > 0 && (
            <StatusBadge variant="warning">
              {publisherOutdatedCount} Node(s) Need Update
            </StatusBadge>
          )}
        </div>

        <Card className="p-0 overflow-hidden border-border/60 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Store Code</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-center">Publisher</TableHead>
                  <TableHead className="text-center">Worker</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Last Check-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && monitoring.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading nodes...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : monitoring.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No nodes registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  monitoring.map((node) => {
                    const status = getNodeStatus(node, currentVersion);
                    const workerVersionNum = Number.parseInt(node.worker_version, 10);
                    const isLegacyWorker =
                      !node.worker_version ||
                      Number.isNaN(workerVersionNum) ||
                      workerVersionNum < 4;

                    return (
                      <TableRow
                        key={node.store_id}
                        className={cn(
                          'group hover:bg-muted/30 transition-colors',
                          isLegacyWorker ? 'bg-status-warning/5' : ''
                        )}
                      >
                        <TableCell className="text-xs font-bold tabular-nums">
                          {node.store_id || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-foreground/90 font-medium">
                          {node.store_name || node.hostname || '-'}
                        </TableCell>
                        <TableCell className="live-text-3xs uppercase font-black text-muted-foreground tracking-widest">
                          {node.branch_name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <code className="bg-muted px-1.5 py-0.5 rounded-md border border-border/40 text-xs font-mono">
                            {node.version || '-'}
                          </code>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isLegacyWorker ? (
                              <span className="px-1.5 py-0.5 rounded bg-status-warning/10 text-status-warning text-4xs font-black uppercase tracking-widest">
                                legacy
                              </span>
                            ) : (
                              <code className="bg-muted px-1.5 py-0.5 rounded-md border border-border/40 text-xs font-mono">
                                v{node.worker_version}
                              </code>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {getStatusBadge(status)}
                            {node.last_error && (
                              <span title={node.last_error}>
                                <AlertCircle className="size-3.5 text-status-error cursor-help" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums text-xs">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-medium">
                              {node.last_check_at ? formatDateTime(node.last_check_at) : '-'}
                            </span>
                            {node.last_check_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAgent(node.store_id)}
                                className="size-8 text-muted-foreground hover:text-status-error hover:bg-status-error/10 opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Agent Record"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Modal
        open={deployModalOpen}
        onClose={() => !isDeploying && setDeployModalOpen(false)}
        title="Deploy New Publisher Version"
      >
        <form onSubmit={handleDeploy} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-3xs font-black uppercase tracking-widest-lg text-muted-foreground/60 ml-4">
                Publisher Binary (.exe)
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-4xl cursor-pointer bg-muted/20 hover:bg-muted/40 border-border/60 hover:border-primary/40 transition-all group/upload">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="size-12 flex items-center justify-center rounded-2xl bg-muted border border-border/60 mb-4 group-hover/upload:bg-primary/10 group-hover/upload:text-primary transition-colors">
                      <FileUp className="size-6" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {file ? (
                        <span className="text-primary">{file.name}</span>
                      ) : (
                        'Select DemoAgentPublisher.exe'
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Click or drag and drop to upload
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".exe" onChange={handleFileChange} />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-3xs font-black uppercase tracking-widest-lg text-muted-foreground/60 ml-4">
                Release Version
              </label>
              <Input
                placeholder="e.g. 1.0.15a"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                className="h-14 rounded-2xl pl-5 font-bold"
              />
              <div className="flex items-center gap-3 px-4 pt-1">
                <div className="flex flex-col">
                  <span className="text-4xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                    Current
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {currentVersion || 'None'}
                  </span>
                </div>
                <div className="w-px h-6 bg-border/40" />
                <div className="flex flex-col">
                  <span className="text-4xs font-black text-primary uppercase tracking-widest leading-none mb-1">
                    Suggested
                  </span>
                  <span className="text-xs font-bold text-primary">{suggestedVersion}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setDeployModalOpen(false)}
              disabled={isDeploying}
              className="h-12 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 rounded-xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
              disabled={isDeploying}
            >
              {isDeploying ? (
                <Loader2 className="animate-spin mr-2 size-4" />
              ) : (
                <UploadCloud className="mr-2 size-4" />
              )}
              Deploy Version
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
};

export default AgentUpdater;
