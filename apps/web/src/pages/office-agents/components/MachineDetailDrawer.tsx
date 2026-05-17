import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getHealthColor } from '../types';
import type { AgentMachine } from '../types';

interface Props {
  machine: AgentMachine | null;
  onClose: () => void;
}

function formatHb(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) +
      ', ' +
      d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    );
  } catch {
    return iso;
  }
}

export function MachineDetailDrawer({ machine, onClose }: Props) {
  if (!machine) return null;

  const { specs, metrics, top_processes, heartbeat_history } = machine;

  return (
    <Sheet
      open={!!machine}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg">{machine.hostname}</SheetTitle>
          <SheetDescription>
            {machine.label ?? 'No label'} &middot;{' '}
            {machine.status === 'online' ? 'Online' : 'Offline'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Full Specs */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Specifications</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="text-foreground">CPU:</span> {specs.cpu_model}
              </p>
              <p>
                <span className="text-foreground">RAM:</span> {specs.ram_gb} GB
              </p>
              <p>
                <span className="text-foreground">Disk:</span> {specs.disk_gb} GB
              </p>
              <p>
                <span className="text-foreground">OS:</span> {specs.os} ({specs.os_build})
              </p>
            </div>
          </div>

          <Separator />

          {/* Live Metrics */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Live Metrics</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-medium">{metrics.cpu_percent}%</span>
                </div>
                <Progress
                  value={metrics.cpu_percent}
                  indicatorClassName={getHealthColor(metrics.cpu_percent)}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">RAM</span>
                  <span className="font-medium">{metrics.ram_percent}%</span>
                </div>
                <Progress
                  value={metrics.ram_percent}
                  indicatorClassName={getHealthColor(metrics.ram_percent)}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Disk</span>
                  <span className="font-medium">{metrics.disk_percent}%</span>
                </div>
                <Progress
                  value={metrics.disk_percent}
                  indicatorClassName={getHealthColor(metrics.disk_percent)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Network Up</span>
                  <p className="text-sm font-medium">{metrics.network_up_mbps} Mbps</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Network Down</span>
                  <p className="text-sm font-medium">{metrics.network_down_mbps} Mbps</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Top Processes */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Top Processes (by CPU)</h4>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Process</TableHead>
                    <TableHead className="text-right">CPU</TableHead>
                    <TableHead className="text-right">RAM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top_processes.slice(0, 5).map((proc) => (
                    <TableRow key={proc.name}>
                      <TableCell className="font-mono text-xs">{proc.name}</TableCell>
                      <TableCell className="text-right">{proc.cpu_percent}%</TableCell>
                      <TableCell className="text-right">{proc.ram_mb} MB</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Heartbeat History */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Heartbeat History (last 10)</h4>
            <div className="space-y-1">
              {heartbeat_history.map((hb, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`size-1.5 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                  />
                  {formatHb(hb)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
