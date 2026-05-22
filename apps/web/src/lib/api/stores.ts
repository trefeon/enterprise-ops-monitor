import { apiGet } from "./client";
import type { ApiResponse } from "./types";

export interface Store {
  store_code: string;
  store_name: string;
  branch_id: string;
  branch_name?: string;
  area?: string;
  region?: string;
  address?: string;
  pic_name?: string;
  contact_number?: string;
  is_active?: boolean | string;
}

export interface StoreListMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

/** GET /api/stores */
export const listStores = (
  params?: Record<string, string | number | undefined>
): Promise<ApiResponse<Store[]>> =>
  apiGet("/stores", { params });

/** GET /api/stores/regions */
export const getRegions = (): Promise<ApiResponse<string[]>> => apiGet("/stores/regions");
