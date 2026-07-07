// ── API response shapes ──────────────────────────────────────

export interface StoreSyncSummary {
  totalStores?: number;
  synced?: number;
  stale?: number;
  problem?: number;
  oldest?: {
    ageSec: number;
    namaToko: string;
  };
  thresholdsSec?: {
    syncedMax: number;
    staleMax: number;
  };
  updatedAt?: string;
}

export interface StoreSyncStatusSource {
  ok?: boolean;
  errorCount: number;
  totalBranches: number;
  errors?: Array<{ branchId: string | number }>;
}

export interface StoreSyncBranch {
  id: string | number;
  name: string;
  total: number;
  synced: number;
  stale: number;
  problem: number;
}

export interface StoreSyncStatus {
  serverNow?: string;
  fetchedAt?: string;
  source?: StoreSyncStatusSource;
  branches?: StoreSyncBranch[];
  window?: Record<string, unknown>;
  windowFast?: Record<string, unknown>;
  progress?: Record<string, unknown>;
  late?: number;
  noTimestamp?: number;
}

export interface Store {
  storeCode: string;
  storeName: string;
  branchName: string;
  branchId?: string | number;
  lastSyncAt?: string;
  lastSyncAgoSec?: number;
  isProblem?: boolean;
  isStale?: boolean;
  status?: string;
}

export interface HistoryRecord {
  id?: string;
  bucketStart?: string;
  bucketEnd?: string;
  polledAt?: string;
  lastSyncAt?: string;
  isProblem?: boolean;
  isStale?: boolean;
}

export interface HistorySummary {
  totalBuckets: number;
  syncedBuckets: number;
  staleBuckets: number;
  problemBuckets: number;
}

export interface HistoryView {
  value: string;
  label: string;
}

export type HistoryBucketKey = 'bucket-10' | 'bucket-30' | 'bucket-60';

export interface BranchOption {
  value: string;
  label: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// ── Component props ───────────────────────────────────────────

export interface SummaryCardsProps {
  summary: StoreSyncSummary | null;
  status: StoreSyncStatus | null;
  syncedMaxLabel: string;
  staleMaxLabel: string;
  statusFilter: string;
  onKpiStatusClick: (status: string) => void;
  onTotalStoresClick: () => void;
  onOldestClick: () => void;
}

export interface BranchHealthProps {
  branches: StoreSyncBranch[];
  branchFilter: string;
  sourceErrorBranchIds: Set<string>;
  onBranchClick: (branchId: string) => void;
}

export interface HistoryDialogProps {
  historyStore: { storeCode: string; storeName: string } | null;
  historyMode: string;
  historyDate: string;
  historyRecords: HistoryRecord[];
  historyLoading: boolean;
  historySummary: HistorySummary | null;
  historyEmptyLabel: string;
  historyViews: HistoryView[];
  onClose: () => void;
  onModeChange: (mode: string) => void;
  onDateChange: (date: string) => void;
}
