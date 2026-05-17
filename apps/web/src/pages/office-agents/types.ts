export type AgentStatus = "online" | "offline"

export interface AgentSpecs {
  cpu_model: string
  ram_gb: number
  disk_gb: number
  os: string
  os_build: string
}

export interface AgentMetrics {
  cpu_percent: number
  ram_percent: number
  disk_percent: number
  network_up_mbps: number
  network_down_mbps: number
}

export interface ProcessInfo {
  name: string
  cpu_percent: number
  ram_mb: number
}

export interface AgentMachine {
  id: string
  hostname: string
  label: string | null
  specs: AgentSpecs
  metrics: AgentMetrics
  top_processes: ProcessInfo[]
  status: AgentStatus
  last_heartbeat: string
  heartbeat_history: string[]
}

export type HealthCategory = "healthy" | "warning" | "critical"

export function categorizeHealth(metrics: AgentMetrics): HealthCategory {
  const max = Math.max(metrics.cpu_percent, metrics.ram_percent, metrics.disk_percent)
  if (max >= 90) return "critical"
  if (max >= 70) return "warning"
  return "healthy"
}

export function getHealthColor(percent: number): string {
  if (percent >= 90) return "bg-red-500"
  if (percent >= 70) return "bg-amber-500"
  return "bg-primary"
}
