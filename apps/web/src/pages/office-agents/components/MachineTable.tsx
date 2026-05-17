import { Edit3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getHealthColor, type AgentMachine } from '../types';

interface MachineTableProps {
  machines: AgentMachine[];
  onView: (machine: AgentMachine) => void;
  onEditLabel: (machine: AgentMachine) => void;
}

function formatHeartbeat(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function MetricCell({ value }: { value: number }) {
  return (
    <div className="min-w-28 space-y-1">
      <div className="text-sm font-medium tabular-nums">{value}%</div>
      <Progress value={value} indicatorClassName={getHealthColor(value)} />
    </div>
  );
}

export function MachineTable({ machines, onView, onEditLabel }: MachineTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Machines</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-44">Hostname</TableHead>
                <TableHead className="min-w-40">Label</TableHead>
                <TableHead className="min-w-72">Specs</TableHead>
                <TableHead className="min-w-32">CPU</TableHead>
                <TableHead className="min-w-32">RAM</TableHead>
                <TableHead className="min-w-32">Disk</TableHead>
                <TableHead className="min-w-28">Status</TableHead>
                <TableHead className="min-w-44">Last Heartbeat</TableHead>
                <TableHead className="min-w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No machines match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell>
                      <div className="font-semibold">{machine.hostname}</div>
                      <div className="text-xs text-muted-foreground">
                        {machine.label ?? 'No label'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-md text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => onEditLabel(machine)}
                      >
                        <span>{machine.label || '(add label)'}</span>
                        <Edit3 className="size-3.5" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <div>{machine.specs.cpu_model}</div>
                        <div>
                          {machine.specs.ram_gb} GB RAM / {machine.specs.disk_gb} GB Disk
                        </div>
                        <div>
                          {machine.specs.os} build {machine.specs.os_build}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <MetricCell value={machine.metrics.cpu_percent} />
                    </TableCell>
                    <TableCell>
                      <MetricCell value={machine.metrics.ram_percent} />
                    </TableCell>
                    <TableCell>
                      <MetricCell value={machine.metrics.disk_percent} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={machine.status === 'online' ? 'success' : 'destructive'}
                      >
                        {machine.status === 'online' ? 'Online' : 'Offline'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          machine.status === 'offline'
                            ? 'text-muted-foreground'
                            : 'text-foreground'
                        }
                      >
                        {formatHeartbeat(machine.last_heartbeat)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(machine)}
                        aria-label={`View ${machine.hostname}`}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
