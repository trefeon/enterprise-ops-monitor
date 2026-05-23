import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Monitor,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { StatCard } from '@/components/shared/StatCard';
import { PageShell } from '@/components/shared/PageShell';
import { Toolbar } from '@/components/shared/Toolbar';
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { getFeatureStory } from '@/data/stories';
import { useOfficeAgents } from './hooks/useOfficeAgents';
import { DownloadDialog } from './components/DownloadDialog';
import { LabelEditDialog } from './components/LabelEditDialog';
import { MachineDetailDrawer } from './components/MachineDetailDrawer';
import { MachineTable } from './components/MachineTable';
import type { AgentMachine } from './types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
] as const;

const getStatusLabelAndIcon = (status: string) => {
  switch (status) {
    case 'online':
      return {
        label: 'Online',
        icon: <span className="h-2 w-2 animate-pulse rounded-full bg-status-success" />,
        color: 'text-status-success'
      };
    case 'offline':
      return {
        label: 'Offline',
        icon: <span className="h-2 w-2 rounded-full bg-status-neutral" />,
        color: 'text-muted-foreground'
      };
    case 'healthy':
      return {
        label: 'Healthy',
        icon: <CheckCircle className="size-4 text-status-success" />,
        color: 'text-status-success'
      };
    case 'warning':
      return {
        label: 'Warning',
        icon: <AlertTriangle className="size-4 text-status-warning" />,
        color: 'text-status-warning'
      };
    case 'critical':
      return {
        label: 'Critical',
        icon: <XCircle className="size-4 text-status-error" />,
        color: 'text-status-error'
      };
    default:
      return {
        label: 'All Statuses',
        icon: <Monitor className="size-4 text-status-info" />,
        color: 'text-foreground'
      };
  }
};

export default function OfficeAgentsPage() {
  const {
    machines,
    stats,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedMachine,
    setSelectedMachine,
    refreshMetrics,
    updateLabel,
  } = useOfficeAgents();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [labelTarget, setLabelTarget] = useState<AgentMachine | null>(null);

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('office-agents')} />
      <PageHeader
        title="Office Agent Monitor"
        description="Real-time health monitoring for office laptops. Agents report CPU, RAM, disk, network, process, and heartbeat data every 60 seconds."
        actions={
          <>
            <Button onClick={refreshMetrics}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setDownloadOpen(true)}>
              <Download className="size-4" />
              Download Office Agent
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Machines"
          value={stats.total}
          icon={<Monitor className="size-5" />}
          subtext={`${stats.online} online · ${stats.offline} offline`}
        />
        <StatCard
          title="Healthy"
          value={stats.healthy}
          icon={<CheckCircle className="size-5 text-status-success" />}
          className="border-status-success/30"
        />
        <StatCard
          title="Warning"
          value={stats.warning}
          icon={<AlertTriangle className="size-5 text-status-warning" />}
          className="border-status-warning/30"
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon={<XCircle className="size-5 text-status-error" />}
          className="border-status-error/30"
        />
      </div>
      <Toolbar
        left={
          <SearchBar
            value={search}
            onValueChange={setSearch}
            placeholder="Search by hostname, CPU, OS..."
            containerClassName="lg:w-96 xl:w-[34rem]"
            className="w-full"
          />
        }
        right={
          <>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
          >
            <SelectTrigger className="w-full min-h-10 border-border bg-input transition-all hover:border-border sm:w-64">
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mr-1">Status:</span>
                {(() => {
                  const details = getStatusLabelAndIcon(statusFilter);
                  return (
                    <span className="flex items-center gap-2">
                      {details.icon}
                      <span className={`text-sm font-medium ${details.color}`}>{details.label}</span>
                    </span>
                  );
                })()}
              </span>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => {
                const details = getStatusLabelAndIcon(option.value);
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2.5">
                      {details.icon}
                      <span>{details.label}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {stats.critical > 0 && (
            <div className="flex min-h-10 items-center gap-2 rounded-md border border-status-error/30 bg-status-error/10 px-4 text-sm font-medium text-status-error">
              <AlertCircle className="size-4" />
              {stats.critical} machine(s) need attention
            </div>
          )}
          </>
        }
      />
      <MachineTable machines={machines} onView={setSelectedMachine} onEditLabel={setLabelTarget} />
      <MachineDetailDrawer machine={selectedMachine} onClose={() => setSelectedMachine(null)} />
      <DownloadDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} />
      {labelTarget && (
        <LabelEditDialog
          machineId={labelTarget.id}
          currentLabel={labelTarget.label}
          open={Boolean(labelTarget)}
          onClose={() => setLabelTarget(null)}
          onSave={updateLabel}
        />
      )}
    </PageShell>
  );
}
