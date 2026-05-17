import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL;
const normalizedBase = rawBase ? String(rawBase).replace(/\/+$/, '') : '';
// If VITE_API_URL is provided, treat it as the API origin (e.g. http://localhost:3000)
// OR the already-prefixed base (e.g. http://localhost:3000/api).
// Otherwise default to same-origin /api (recommended for production behind a reverse proxy).
const API_BASE_URL = normalizedBase
  ? normalizedBase.endsWith('/api')
    ? normalizedBase
    : `${normalizedBase}/api`
  : '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token if needed (though cookie is preferred per blueprint)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for standard error handling
apiClient.interceptors.response.use(
  (response) => {
    // Blueprint: { ok: true, data: ..., meta: ..., error: null }
    return response.data;
  },
  (error) => {
    const isCanceled = error?.code === 'ERR_CANCELED' || axios.isCancel?.(error);
    const isTimeout =
      error?.code === 'ECONNABORTED' ||
      String(error?.message || '')
        .toLowerCase()
        .includes('timeout');

    if (isCanceled) {
      return Promise.reject({
        ok: false,
        code: 'CANCELED',
        message: 'Request canceled',
        isCanceled: true,
        original: error,
      });
    }

    const customError = {
      ok: false,
      code:
        (isTimeout ? 'TIMEOUT' : error.response?.data?.error?.code) ||
        (error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR'),
      message: isTimeout
        ? 'Request timed out'
        : error.response?.data?.error?.message || error.message || 'An unexpected error occurred',
      original: error,
    };
    return Promise.reject(customError);
  }
);

/**
 * Generic GET request
 * @template T
 * @param {string} url
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiGet = async (url, config) => {
  return apiClient.get(url, config);
};

/**
 * Generic POST request
 * @template T
 * @param {string} url
 * @param {any} data
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiPost = async (url, data, config) => {
  return apiClient.post(url, data, config);
};

/**
 * Generic PATCH request
 * @template T
 * @param {string} url
 * @param {any} data
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiPatch = async (url, data, config) => {
  return apiClient.patch(url, data, config);
};

/**
 * Generic PUT request
 * @template T
 * @param {string} url
 * @param {any} data
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiPut = async (url, data, config) => {
  return apiClient.put(url, data, config);
};

/**
 * Generic DELETE request
 * @template T
 * @param {string} url
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiDelete = async (url, config) => {
  return apiClient.delete(url, config);
};
