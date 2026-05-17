import React, { useEffect, useState } from 'react';
import { apiClient, apiGet, apiPost } from '../lib/api/client';
import { AuthContext } from './AuthContext';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

const getAuthUserRaw = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
};

const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

const persistAuth = ({ token, user, persist }) => {
  if (typeof window === 'undefined') return;
  const storage = persist ? localStorage : sessionStorage;
  const other = persist ? sessionStorage : localStorage;

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));

  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
};

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const token = getAuthToken();
  const storedUser = getAuthUserRaw();
  if (!token || !storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(getAuthToken());
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return undefined;
    }

    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    let active = true;
    const refreshUser = async () => {
      setLoading(true);
      try {
        const res = await apiGet('/auth/me');
        if (res.ok && res.data?.user) {
          // RBAC v2: Store full user object with effectivePerms, roleNames, scopeBranches
          const userData = {
            ...res.data.user,
            // Ensure these fields are present
            effectivePerms: res.data.user.effectivePerms || [],
            roleNames: res.data.user.roleNames || [res.data.user.role],
            scopeBranches: res.data.user.scopeBranches || [],
            isAllBranches: res.data.user.isAllBranches ?? true,
          };
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        }
      } catch (error) {
        const isUnauthorized =
          error?.code === 'UNAUTHORIZED' || error?.code === 'INVALID_CREDENTIALS';
        if (isUnauthorized) {
          clearAuthStorage();
          delete apiClient.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    refreshUser();
    return () => {
      active = false;
    };
  }, []);

  const login = async (username, password, options = {}) => {
    try {
      const res = await apiPost('/auth/login', { username, password });

      if (res.ok) {
        const { token, user: nextUser } = res.data;
        // RBAC v2: Enhance user data
        const userData = {
          ...nextUser,
          effectivePerms: nextUser.effectivePerms || [],
          roleNames: nextUser.roleNames || [nextUser.role],
          scopeBranches: nextUser.scopeBranches || [],
          isAllBranches: nextUser.isAllBranches ?? true,
        };
        persistAuth({ token, user: userData, persist: Boolean(options?.persist) });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = () => {
    clearAuthStorage();
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    api: apiClient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
