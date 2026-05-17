import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AgentMachine } from '../types';
import { generateMockMachines, rerollMetrics } from '../mock-data';

const AUTO_REFRESH_MS = 60_000;

type StatusFilter = 'all' | 'online' | 'offline' | 'healthy' | 'warning' | 'critical';

export function useOfficeAgents() {
  const [machines, setMachines] = useState<AgentMachine[]>(() => generateMockMachines());
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshMetrics = useCallback(() => {
    setMachines((prev) => prev.map((m) => (m.status === 'online' ? rerollMetrics(m) : m)));
  }, []);

  const updateLabel = useCallback((id: string, label: string) => {
    const normalized = label.trim() || null;
    setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, label: normalized } : m)));
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(refreshMetrics, AUTO_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshMetrics]);

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.id === selectedMachineId) ?? null,
    [machines, selectedMachineId]
  );

  const filtered = machines.filter((m) => {
    if (statusFilter === 'online' && m.status !== 'online') return false;
    if (statusFilter === 'offline' && m.status !== 'offline') return false;
    if (statusFilter === 'healthy') {
      const max = Math.max(m.metrics.cpu_percent, m.metrics.ram_percent, m.metrics.disk_percent);
      if (max >= 70) return false;
    }
    if (statusFilter === 'warning') {
      const max = Math.max(m.metrics.cpu_percent, m.metrics.ram_percent, m.metrics.disk_percent);
      if (max < 70 || max >= 90) return false;
    }
    if (statusFilter === 'critical') {
      const max = Math.max(m.metrics.cpu_percent, m.metrics.ram_percent, m.metrics.disk_percent);
      if (max < 90) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const hostname = m.hostname.toLowerCase();
      const label = (m.label ?? '').toLowerCase();
      const cpu = m.specs.cpu_model.toLowerCase();
      const os = m.specs.os.toLowerCase();
      if (!hostname.includes(q) && !label.includes(q) && !cpu.includes(q) && !os.includes(q))
        return false;
    }
    return true;
  });

  const stats = {
    total: machines.length,
    online: machines.filter((m) => m.status === 'online').length,
    offline: machines.filter((m) => m.status === 'offline').length,
    healthy: machines.filter(
      (m) => Math.max(m.metrics.cpu_percent, m.metrics.ram_percent, m.metrics.disk_percent) < 70
    ).length,
    warning: machines.filter((m) => {
      const max = Math.max(m.metrics.cpu_percent, m.metrics.ram_percent, m.metrics.disk_percent);
      return max >= 70 && max < 90;
    }).length,
    critical: machines.filter(
      (m) => Math.max(m.metrics.cpu_percent, m.metrics.ram_percent, m.metrics.disk_percent) >= 90
    ).length,
  };

  return {
    machines: filtered,
    allMachines: machines,
    stats,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedMachine,
    setSelectedMachine: (machine: AgentMachine | null) => setSelectedMachineId(machine?.id ?? null),
    refreshMetrics,
    updateLabel,
  };
}
