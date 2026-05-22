// ── API response shapes ──────────────────────────────────────
export interface EODStore {
  storeId: string;
  storeCode: string;
  storeName: string;
  areaId: string;
  areaName: string;
  region?: string;
  picName?: string;
  phone?: string;
  status: 'done' | 'pending' | 'failed';
  lastEodAt?: string;
  lastSyncAt?: string;
  source?: string;
  errorMessage?: string;
}

export interface EODStoreDetail {
  store: {
    storeCode: string;
    storeName: string;
    areaName: string;
    region?: string;
    picName?: string;
    phone?: string;
  };
  eod: {
    status: string;
    lastEodAt?: string;
    lastSyncAt?: string;
    source?: string;
    errorMessage?: string;
  };
}

export interface EODArea {
  areaId: string;
  areaName: string;
  storesTotal: number;
  done: number;
  pending: number;
  failed: number;
}

export interface EODStats {
  total: number;
  done: number;
  pending: number;
  failed: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface EODFilters {
  areaId: string;
  status: string;
  date: string;
  q: string;
}

// ── Component props ───────────────────────────────────────────
export interface StatusStyle {
  label: string;
  variant: 'success' | 'warning' | 'destructive' | 'default';
}

export interface BranchInfo {
  areaId: string;
  areaName: string;
  storesTotal: number;
  done: number;
  pending: number;
  failed: number;
}
