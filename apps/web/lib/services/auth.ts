import api from "@/lib/api";
import type { AuthUser, LoginCredentials, LoginResponse } from "@/types/auth";

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/auth/login", credentials);
  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/api/auth/me");
  return data;
}
