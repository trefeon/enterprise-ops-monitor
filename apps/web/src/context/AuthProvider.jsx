import React, { useEffect, useState } from 'react';
import { apiClient, apiGet, apiPost } from '../lib/api/client';
import { AuthContext } from './AuthContext';

// ADR-5: the JWT lives in memory ONLY — never in localStorage/sessionStorage
// (XSS can steal a stored token; the httpOnly auth_token cookie is the
// durable session). On boot, the session is restored from the cookie via
// /api/auth/me, which mints a fresh in-memory token.

const setAuthHeader = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

const normalizeUser = (rawUser) => ({
  ...rawUser,
  // Ensure these fields are present
  effectivePerms: rawUser.effectivePerms || [],
  roleNames: rawUser.roleNames || [rawUser.role],
  scopeBranches: rawUser.scopeBranches || [],
  isAllBranches: rawUser.isAllBranches ?? true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => typeof window !== 'undefined');

  // Derive currentOrgId from the in-memory user object
  const [currentOrgId, setCurrentOrgId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let active = true;
    const restoreSession = async () => {
      setLoading(true);
      try {
        // No token in memory → the httpOnly auth_token cookie is the only
        // credential. /me accepts the cookie via the API's cookie-to-Bearer
        // bridge and mints a fresh token for subsequent requests.
        const res = await apiGet('/auth/me');
        if (res.ok && res.data?.user) {
          if (res.data.token) {
            setAuthHeader(res.data.token);
          }
          const userData = normalizeUser(res.data.user);
          setUser(userData);
          if (userData.orgId) {
            setCurrentOrgId(userData.orgId);
          }
        }
      } catch (error) {
        const isUnauthorized =
          error?.code === 'UNAUTHORIZED' || error?.code === 'INVALID_CREDENTIALS';
        if (isUnauthorized) {
          setAuthHeader(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = async (username, password) => {
    try {
      const res = await apiPost('/auth/login', { username, password });

      if (res.ok) {
        const { token, user: nextUser } = res.data;
        setAuthHeader(token);
        setUser(normalizeUser(nextUser));
        if (nextUser.orgId) {
          setCurrentOrgId(nextUser.orgId);
        }
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async ({ username, email, password, orgName }) => {
    try {
      const res = await apiPost('/auth/register', { username, email, password, orgName });

      if (res.ok) {
        const { token, user: nextUser } = res.data;
        setAuthHeader(token);
        setUser(normalizeUser(nextUser));
        if (nextUser.orgId) {
          setCurrentOrgId(nextUser.orgId);
        }
        return { success: true };
      }
      return { success: false, error: res.error?.message || 'Registration failed' };
    } catch (error) {
      console.error('Register error', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setAuthHeader(null);
    setUser(null);
    setCurrentOrgId(null);
    setLoading(false);
  };

  const value = {
    user,
    loading,
    currentOrgId,
    login,
    register,
    logout,
    api: apiClient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
