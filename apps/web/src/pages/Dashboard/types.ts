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
  };
  employees: {
    total: number;
    branches: number;
    syncedAt?: string;
  };
}

export interface Alert {
  id: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  createdAt: string;
}
