import { apiGet } from "./client";
import type { ApiResponse } from "./types";

export interface EODStore {
  store_code: string;
  store_name: string;
  branch_id: string;
  status_sales?: string;
  recorded_date?: string;
}

export interface EODSummary {
  total_stores?: number;
  done?: number;
  pending?: number;
  failed?: number;
}

/** GET /api/eod/summary */
export const getEODSummary = (
  params?: Record<string, string | undefined>
): Promise<ApiResponse<EODSummary>> => apiGet("/eod/summary", { params });

/** GET /api/eod/live (public) */
export const getEODLive = (): Promise<ApiResponse<EODStore[]>> => apiGet("/eod/live");
