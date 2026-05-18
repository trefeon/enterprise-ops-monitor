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
import { Card, CardContent } from '@/components/ui/card';
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
import PageShell from '@/components/ui/PageShell';
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
        icon: <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />,
        color: 'text-emerald-500 dark:text-emerald-400'
      };
    case 'offline':
      return {
        label: 'Offline',
        icon: <span className="h-2 w-2 rounded-full bg-zinc-500 dark:bg-zinc-600" />,
        color: 'text-zinc-500 dark:text-zinc-400'
      };
    case 'healthy':
      return {
        label: 'Healthy',
        icon: <CheckCircle className="size-4 text-emerald-500" />,
        color: 'text-emerald-500 dark:text-emerald-400'
      };
    case 'warning':
      return {
        label: 'Warning',
        icon: <AlertTriangle className="size-4 text-amber-500" />,
        color: 'text-amber-500 dark:text-amber-400'
      };
    case 'critical':
      return {
        label: 'Critical',
        icon: <XCircle className="size-4 text-red-500" />,
        color: 'text-red-500 dark:text-red-400'
      };
    default:
      return {
        label: 'All Statuses',
        icon: <Monitor className="size-4 text-sky-500 dark:text-sky-400" />,
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
          icon={<CheckCircle className="size-5 text-emerald-500" />}
          className="border-emerald-500/30"
        />
        <StatCard
          title="Warning"
          value={stats.warning}
          icon={<AlertTriangle className="size-5 text-amber-500" />}
          className="border-amber-500/30"
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon={<XCircle className="size-5 text-red-500" />}
          className="border-red-500/30"
        />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
          <SearchBar
            value={search}
            onValueChange={setSearch}
            placeholder="Search by hostname, CPU, OS..."
            className="w-full md:max-w-md"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
          >
            <SelectTrigger className="w-full min-h-[44px] md:w-60 bg-zinc-900/40 border-border/80 transition-all hover:bg-zinc-900/60 hover:border-border">
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
            <div className="flex min-h-[44px] items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 text-sm font-medium text-red-500">
              <AlertCircle className="size-4" />
              {stats.critical} machine(s) need attention
            </div>
          )}
        </CardContent>
      </Card>
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
