import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '@/components/ui/button';
import Modal from '../../components/ui/Modal';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from '../../components/ui/StatusBadge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDateTime } from '../../lib/date';
import EmptyState from '../../components/ui/EmptyState';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
      return <StatusBadge variant="info">Checking</StatusBadge>;
    case 'downloading':
      return <StatusBadge variant="info">Downloading</StatusBadge>;
    case 'updating':
      return <StatusBadge variant="info">Updating</StatusBadge>;
    case 'error':
      return <StatusBadge variant="danger">Error</StatusBadge>;
    case 'uninstalled':
      return <StatusBadge variant="neutral">Not Installed</StatusBadge>;
    default:
      return <StatusBadge variant="neutral">Unknown</StatusBadge>;
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
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
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
      <EmptyState
        title="Error Loading Agent Data"
        description={error}
        icon="error"
        action={{ label: 'Retry', icon: 'refresh', onClick: handleRefresh }}
      />
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
    <div className="page-container">
      <FeatureStoryBanner story={getFeatureStory('agent-updater')} />
      <header className="page-header">
        <div className="space-y-1">
          <h1 className="page-title">Agent Updater</h1>
          <p className="page-subtitle">
            One-way update flow: worker checks server version, downloads publisher if outdated, then
            replaces and restarts DemoAgentPublisher.exe.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
            <Loader2 className="animate-spin mr-2" />
            <span className="material-symbols-outlined mr-2">refresh</span>
            Refresh
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} disabled={exporting || loading}>
            {exporting && <Loader2 className="animate-spin mr-2" />}
            <span className="material-symbols-outlined mr-2">download</span>
            Export Excel
          </Button>
          <Button variant="secondary" onClick={handleDownloadSetup}>
            <span className="material-symbols-outlined mr-2">download</span>
            Setup Script
          </Button>
          <Button onClick={handleOpenDeployModal}>
            <span className="material-symbols-outlined mr-2">cloud_upload</span>
            Deploy Update
          </Button>
        </div>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="flex flex-col gap-2">
          <CardContent>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Current Deployed Version
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-foreground">
                {metricsLoading ? '...' : currentVersion || 'None'}
              </span>
              {!metricsLoading && currentVersion && (
                <span className="material-symbols-outlined text-success">verified</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col gap-2">
          <CardContent>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Nodes
            </span>
            <span className="text-3xl font-bold text-foreground">
              {metricsLoading ? '--' : installedAgents.length}
            </span>
            {!metricsLoading && (
              <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto">
                <span>{runningPublisherCount} node(s) synced</span>
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <span className="relative flex h-2 w-2 mr-1">
                    {activeDownloads > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    )}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  {activeDownloads}/10 Active DLs
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col gap-2">
          <CardContent>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Publisher Sync
            </span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-foreground">
                {metricsLoading ? '--' : publisherSyncedPercent}
              </span>
              <StatusBadge
                variant={
                  metricsLoading
                    ? 'neutral'
                    : installedAgents.length === 0
                      ? 'neutral'
                      : publisherOutdatedCount === 0
                        ? 'success'
                        : 'warning'
                }
              >
                {metricsLoading
                  ? 'Loading'
                  : installedAgents.length === 0
                    ? 'No Active Agents'
                    : publisherOutdatedCount === 0
                      ? 'Publisher Synced'
                      : `${publisherOutdatedCount} Outdated`}
              </StatusBadge>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col gap-2">
          <CardContent>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Legacy Worker Scripts
            </span>
            <span className="text-3xl font-bold text-foreground">
              {metricsLoading ? '--' : nonModernWorkers}
            </span>
            <span className="text-xs text-muted-foreground">
              Setup script terbaru membersihkan jejak migrator palsu saat dijalankan.
            </span>
          </CardContent>
        </Card>
      </section>
      <section className="flex flex-wrap items-end gap-3">
        <div className="relative w-full flex-1 min-w-48"><span
            className="absolute left-3 inset-y-0 flex items-center text-muted-foreground material-symbols-outlined text-xl leading-none pointer-events-none">search</span><Input
            placeholder="Search by store code or name..."
            name="q"
            value={filters.q}
            onChange={handleFilterChange}
            onKeyDown={handleSearch}
            className="pl-10" /></div>
        <Select
          value={filters.areaId}
          onValueChange={val => handleFilterChange({
            target: {
              value: val
            }
          })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent><SelectItem value="">All Branches</SelectItem>{AREA_OPTIONS.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.label}
              </SelectItem>
            ))}</SelectContent>
        </Select>
        <Select
          value={filters.region}
          onValueChange={val => handleFilterChange({
            target: {
              value: val
            }
          })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent><SelectItem value="">All Regional Heads</SelectItem>{regionalHeads.map((rh) => (
              <SelectItem key={rh} value={rh}>
                {rh}
              </SelectItem>
            ))}</SelectContent>
        </Select>
        <Button variant="secondary" onClick={applyFilters}>
          <span className="material-symbols-outlined mr-2">search</span>
          Apply
        </Button>
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Deployment Monitoring</h2>
          {publisherOutdatedCount > 0 && (
            <StatusBadge variant="warning">
              {publisherOutdatedCount} Node(s) Need Update
            </StatusBadge>
          )}
        </div>

        <Card className="p-0 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                  <TableHead>Store Code</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-center">
                    Publisher
                  </TableHead>
                  <TableHead className="text-center">
                    Worker
                  </TableHead>
                  <TableHead className="text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-right">
                    Last Check-in
                  </TableHead>
                </TableRow></TableHeader>
              <TableBody>
                {loading && monitoring.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading nodes...</TableCell></TableRow>
                ) : monitoring.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No nodes registered yet.</TableCell></TableRow>
                ) : (
                  monitoring.map((node) => {
                    const status = getNodeStatus(node, currentVersion);
                    const workerVersionNum = Number.parseInt(node.worker_version, 10);
                    const isLegacyWorker =
                      !node.worker_version ||
                      Number.isNaN(workerVersionNum) ||
                      workerVersionNum < 4;

                    return (
                      <TableRow key={node.store_id} className={isLegacyWorker ? 'bg-warning/5' : ''}>
                        <TableCell className="font-semibold font-mono text-xs">
                          {node.store_id || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {node.store_name || node.hostname || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{node.branch_name || '-'}</TableCell>
                        <TableCell className="text-center">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                            {node.version || '-'}
                          </code>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isLegacyWorker ? (
                              <span className="text-warning text-xs font-semibold">legacy</span>
                            ) : (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                                v{node.worker_version}
                              </code>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getStatusBadge(status)}
                            {node.last_error && (
                              <span
                                className="material-symbols-outlined text-danger text-sm cursor-help"
                                title={node.last_error}
                              >
                                error
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          <div className="flex items-center justify-end gap-2">
                            {node.last_check_at ? formatDateTime(node.last_check_at) : '-'}
                            {node.last_check_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAgent(node.store_id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete Agent Record"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
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
              <label className="text-sm font-medium text-foreground">Publisher Binary (.exe)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted border-border hover:border-primary transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground mb-2">
                      upload_file
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {file ? (
                        <span className="text-primary font-semibold">{file.name}</span>
                      ) : (
                        'Click to select DemoAgentPublisher.exe'
                      )}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".exe" onChange={handleFileChange} />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Release Version</label>
              <Input
                placeholder="e.g. 1.0.15a"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-semibold">{currentVersion || 'None'}</span>
                {' · '}
                Suggested: <span className="font-semibold">{suggestedVersion}</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeployModalOpen(false)}
              disabled={isDeploying}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isDeploying && <Loader2 className="animate-spin mr-2" />}
              Confirm Deployment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AgentUpdater;
