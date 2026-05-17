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
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
        <CardContent>
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by hostname, CPU, OS..."
              className="w-full md:max-w-md"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="w-full min-h-[44px] md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stats.critical > 0 && (
              <div className="flex min-h-[44px] items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 text-sm text-red-500">
                <AlertCircle className="size-4" />
                {stats.critical} machine(s) need attention
              </div>
            )}
          </CardContent>
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
    </div>
  );
}
