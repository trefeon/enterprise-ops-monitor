import type { Context } from 'react';

export interface AuthContextValue {
  user: any;
  loading: boolean;
  currentOrgId: string | null;
  login: (
    username: string,
    password: string,
    options?: { persist?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    username?: string;
    email: string;
    password: string;
    orgName: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  api: any;
}

export const AuthContext: Context<AuthContextValue | null>;
export function useAuth(): AuthContextValue;
