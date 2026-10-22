import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AUTH_COOKIE_NAME, AUTH_TOKEN_KEY } from "@/lib/auth-constants";

export { AUTH_COOKIE_NAME, AUTH_TOKEN_KEY };

/**
 * Base URL backend Express.js, diambil dari env `NEXT_PUBLIC_API_URL`.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Error terstandardisasi dari response API, membawa status HTTP dan payload server.
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  // max-age 8 jam, selaras dengan masa berlaku JWT
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; path=/; max-age=${8 * 60 * 60}; samesite=lax`;
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(
        new ApiError("Koneksi ke server timeout, silakan coba lagi.", 408)
      );
    }

    if (!error.response) {
      return Promise.reject(
        new ApiError(
          `Tidak dapat terhubung ke API (${API_BASE_URL}). Pastikan backend berjalan.`,
          0
        )
      );
    }

    const { status, data } = error.response;

    if (status === 401) {
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
    }

    const message =
      data?.message ||
      data?.error ||
      (status === 401
        ? "Sesi tidak valid, silakan login kembali."
        : `Request gagal dengan status ${status}.`);

    return Promise.reject(new ApiError(message, status, data));
  }
);

export default api;
