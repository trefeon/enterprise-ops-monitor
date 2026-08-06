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
  // ADR-5: the auth_token cookie (httpOnly, SameSite=Strict) must be sent with
  // every request so the session survives browser refreshes; the in-memory
  // Bearer header is attached by AuthProvider after login/register.
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// ── Org-scoped API helpers ─────────────────────────────────────────────────

/**
 * Prefix a URL with the org path: /api/orgs/{orgId}{url}
 * @param {string} url
 * @param {string} orgId
 * @returns {string}
 */
function orgUrl(url, orgId) {
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `/orgs/${orgId}${clean}`;
}

/**
 * Org-scoped GET — calls /api/orgs/{orgId}{url}
 * @template T
 * @param {string} url
 * @param {string} orgId
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiOrgGet = async (url, orgId, config) => {
  return apiClient.get(orgUrl(url, orgId), config);
};

/**
 * Org-scoped POST — calls /api/orgs/{orgId}{url}
 * @template T
 * @param {string} url
 * @param {string} orgId
 * @param {any} data
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiOrgPost = async (url, orgId, data, config) => {
  return apiClient.post(orgUrl(url, orgId), data, config);
};

/**
 * Org-scoped PATCH — calls /api/orgs/{orgId}{url}
 * @template T
 * @param {string} url
 * @param {string} orgId
 * @param {any} data
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiOrgPatch = async (url, orgId, data, config) => {
  return apiClient.patch(orgUrl(url, orgId), data, config);
};

/**
 * Org-scoped PUT — calls /api/orgs/{orgId}{url}
 * @template T
 * @param {string} url
 * @param {string} orgId
 * @param {any} data
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiOrgPut = async (url, orgId, data, config) => {
  return apiClient.put(orgUrl(url, orgId), data, config);
};

/**
 * Org-scoped DELETE — calls /api/orgs/{orgId}{url}
 * @template T
 * @param {string} url
 * @param {string} orgId
 * @param {object} [config]
 * @returns {Promise<import('./types').ApiResponse<T, any>>}
 */
export const apiOrgDelete = async (url, orgId, config) => {
  return apiClient.delete(orgUrl(url, orgId), config);
};
