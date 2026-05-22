import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { ApiResponse } from "../api/types";

const rawBase = import.meta.env.VITE_API_URL;
const normalizedBase = rawBase ? String(rawBase).replace(/\/+$/, "") : "";
const API_BASE_URL = normalizedBase
  ? normalizedBase.endsWith("/api")
    ? normalizedBase
    : `${normalizedBase}/api`
  : "/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor attaches the stored bearer token for authenticated calls.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

interface CustomError {
  ok: false;
  code: string;
  message: string;
  isCanceled?: boolean;
  original?: unknown;
}

// Response interceptor for standard error handling
apiClient.interceptors.response.use(
  (response) => {
    // Blueprint: { ok: true, data: ..., meta: ..., error: null }
    return response.data;
  },
  (error) => {
    const isCanceled = error?.code === "ERR_CANCELED" || axios.isCancel?.(error);
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      String(error?.message || "")
        .toLowerCase()
        .includes("timeout");

    if (isCanceled) {
      return Promise.reject({
        ok: false,
        code: "CANCELED",
        message: "Request canceled",
        isCanceled: true,
        original: error,
      } satisfies CustomError);
    }

    const customError: CustomError = {
      ok: false,
      code:
        (isTimeout ? "TIMEOUT" : error.response?.data?.error?.code) ||
        (error.response ? "HTTP_ERROR" : "NETWORK_ERROR"),
      message: isTimeout
        ? "Request timed out"
        : error.response?.data?.error?.message || error.message || "An unexpected error occurred",
      original: error,
    };
    return Promise.reject(customError);
  }
);

/** Generic GET request */
export const apiGet = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  return apiClient.get(url, config) as Promise<ApiResponse<T>>;
};

/** Generic POST request */
export const apiPost = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  return apiClient.post(url, data, config) as Promise<ApiResponse<T>>;
};

/** Generic PATCH request */
export const apiPatch = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  return apiClient.patch(url, data, config) as Promise<ApiResponse<T>>;
};

/** Generic PUT request */
export const apiPut = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  return apiClient.put(url, data, config) as Promise<ApiResponse<T>>;
};

/** Generic DELETE request */
export const apiDelete = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  return apiClient.delete(url, config) as Promise<ApiResponse<T>>;
};
