export interface DashboardSummary {
  storesTotal: number;
  eod: {
    done: number;
    pending: number;
    failed: number;
    date?: string;
    lastSyncAt?: string;
  };
  systemHealth: string;
  interactionsToday: number;
  backups: {
    available: number;
    latestAt?: string;
    successRate?: number;
    failedCount?: number;
  };
  employees: {
    total: number;
    branches: number;
    syncedAt?: string;
  };
  agents?: {
    activeCount: number;
    totalCount: number;
    onlineCount: number;
    updatePending: number;
  };
  violations?: {
    todayCount: number;
    activeTerminals: number;
  };
  sync?: {
    healthyPercentage: number;
    syncedCount: number;
    staleCount: number;
    problemCount: number;
  };
}

export interface Alert {
  id: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  createdAt: string;
}
