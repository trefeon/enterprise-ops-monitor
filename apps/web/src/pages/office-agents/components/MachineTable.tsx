import { Edit3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getHealthColor, type AgentMachine } from "../types";

interface MachineTableProps {
  machines: AgentMachine[];
  onView: (machine: AgentMachine) => void;
  onEditLabel: (machine: AgentMachine) => void;
}

function formatHeartbeat(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function MetricCell({ value }: { value: number }) {
  return (
    <div className="mx-auto min-w-28 space-y-1">
      <div className="text-sm font-medium tabular-nums">{value}%</div>
      <Progress value={value} indicatorClassName={getHealthColor(value)} />
    </div>
  );
}

export function MachineTable({ machines, onView, onEditLabel }: MachineTableProps) {
  return (
    <DataTable
      columns={[
        {
          header: "Hostname",
          render: (machine) => (
            <div>
              <div className="font-semibold">{machine.hostname}</div>
              <div className="text-xs text-muted-foreground">{machine.label ?? "No label"}</div>
            </div>
          ),
        },
        {
          header: "Label",
          render: (machine) => (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 justify-start gap-2 px-0 text-left text-sm text-muted-foreground hover:text-foreground"
              onClick={() => onEditLabel(machine)}
            >
              <span>{machine.label || "(add label)"}</span>
              <Edit3 className="size-3.5" />
            </Button>
          ),
        },
        {
          header: "Specs",
          render: (machine) => (
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div>{machine.specs.cpu_model}</div>
              <div>
                {machine.specs.ram_gb} GB RAM / {machine.specs.disk_gb} GB Disk
              </div>
              <div>
                {machine.specs.os} build {machine.specs.os_build}
              </div>
            </div>
          ),
        },
        { header: "CPU", className: "text-center", render: (machine) => <MetricCell value={machine.metrics.cpu_percent} /> },
        { header: "RAM", className: "text-center", render: (machine) => <MetricCell value={machine.metrics.ram_percent} /> },
        { header: "Disk", className: "text-center", render: (machine) => <MetricCell value={machine.metrics.disk_percent} /> },
        {
          header: "Status",
          className: "text-center",
          render: (machine) => (
            <StatusBadge variant={machine.status === "online" ? "success" : "destructive"}>
              {machine.status === "online" ? "Online" : "Offline"}
            </StatusBadge>
          ),
        },
        {
          header: "Last Heartbeat",
          className: "tabular-nums",
          render: (machine) => (
            <span className={machine.status === "offline" ? "text-muted-foreground" : "text-foreground"}>
              {formatHeartbeat(machine.last_heartbeat)}
            </span>
          ),
        },
        {
          header: "Actions",
          className: "text-right",
          render: (machine) => (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(machine)}
              aria-label={`View ${machine.hostname}`}
            >
              <Eye className="size-4" />
            </Button>
          ),
        },
      ]}
      data={machines}
      keyExtractor={(machine) => machine.id}
      emptyState="No machines match the current filters."
    />
  );
}
