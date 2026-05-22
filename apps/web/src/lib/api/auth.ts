import { apiPost, apiGet, apiPatch } from "./client";
import type { ApiResponse } from "./types";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string | number;
    username: string;
    role: string;
    roleNames?: string[];
    effectivePerms?: string[];
    scopeBranches?: string[];
    isAllBranches?: boolean;
  };
}

export interface MeResult {
  user: LoginResult["user"];
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** POST /api/auth/login */
export const login = (payload: LoginPayload): Promise<ApiResponse<LoginResult>> =>
  apiPost("/auth/login", payload);

/** POST /api/auth/logout */
export const logout = (): Promise<ApiResponse<{ message: string }>> => apiPost("/auth/logout");

/** GET /api/auth/me */
export const getMe = (): Promise<ApiResponse<MeResult>> => apiGet("/auth/me");

/** PATCH /api/auth/me/password */
export const changePassword = (
  payload: ChangePasswordPayload
): Promise<ApiResponse<{ message: string }>> => apiPatch("/auth/me/password", payload);
