export interface User {
  id?: string
  username?: string
  role?: string
  roleNames?: string[]
  effectivePerms?: string[]
  isDemo?: boolean
  avatar?: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages?: number
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: { message: string }
  meta?: {
    pagination?: PaginationMeta
    date?: string
    updatedAt?: string
    [key: string]: unknown
  }
}

export interface Branch {
  id: string
  name: string
}

export interface Store {
  storeCode: string
  storeName: string
  areaId?: string
  areaName?: string
  region?: string
}

export interface StatusConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}
