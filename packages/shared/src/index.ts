// Shared TypeScript types for Enterprise Ops Monitor
// Used by both apps/web and apps/api

// ─── API Response Envelope ─────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown[] };
  meta?: {
    pagination?: PaginationMeta;
    timezone?: string;
    [key: string]: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
}

// ─── User & Auth ───────────────────────────────────────
export interface User {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  roleNames?: string[];
  effectivePerms?: string[];
  isDemo?: boolean;
  isAllBranches?: boolean;
  scopeBranches?: string[];
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ─── Models ────────────────────────────────────────────
export interface Store {
  id?: string;
  storeCode: string;
  storeName: string;
  branchId?: string;
  branchName?: string;
  region?: string;
  area?: string;
  areaName?: string;
  regional?: string;
  city?: string;
  address?: string;
  status?: string;
  employeeCount?: number;
  isActive?: boolean;
}

export interface Branch {
  id: string;
  code?: string;
  name: string;
  region?: string;
}

export interface EODStore {
  storeCode: string;
  storeName: string;
  branchId?: string;
  branchName?: string;
  status: 'done' | 'pending' | 'failed';
  lastSyncAt?: string;
  lastEodAt?: string;
  source?: string;
  errorMessage?: string;
}

export interface EODArea {
  areaId: string;
  areaName: string;
  storesTotal: number;
  done: number;
  pending: number;
  failed: number;
  completionRate: number;
}

export interface BackupFile {
  fileName: string;
  type: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface BackupSummary {
  count: number;
  totalSizeBytes: number;
  latestBackupAt: string;
  disk: {
    usedBytes: number;
    totalBytes: number;
    freeBytes: number;
    usedPercent: number;
  };
  schedule: {
    cron: string;
    enabled: boolean;
  };
}

export interface SyncSummary {
  healthyPercentage: number;
  healthyCount: number;
  staleCount: number;
  problemCount: number;
  lastSyncAt: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  createdAt: string;
}

export interface AgentMachine {
  id: string;
  hostname: string;
  status: 'online' | 'offline' | 'healthy' | 'warning' | 'critical';
  cpu: number;
  ram: number;
  disk: number;
  lastHeartbeat: string;
  label?: string;
  os?: string;
}
