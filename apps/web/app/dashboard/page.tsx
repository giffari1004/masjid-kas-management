"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, clearAuthToken } from "@/lib/api";
import { getCurrentUser } from "@/lib/services/auth";
import type { AuthUser } from "@/types/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    clearAuthToken();
    router.replace("/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        if (err instanceof ApiError && err.status === 401) {
          handleLogout();
          return;
        }

        setError(err instanceof ApiError ? err.message : "Gagal memuat profil.");
      });

    return () => {
      cancelled = true;
    };
  }, [handleLogout]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {user ? `Selamat datang, ${user.name}.` : "Memuat sesi…"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Keluar
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {user ? (
        <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
          <div className="flex justify-between px-4 py-2">
            <dt className="text-zinc-500 dark:text-zinc-400">Nama</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{user.name}</dd>
          </div>
          <div className="flex justify-between px-4 py-2">
            <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{user.email}</dd>
          </div>
          <div className="flex justify-between px-4 py-2">
            <dt className="text-zinc-500 dark:text-zinc-400">Peran</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{user.role}</dd>
          </div>
        </dl>
      ) : null}

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Halaman ini diproteksi: tanpa token, Anda akan diarahkan ke /login.
      </p>
    </div>
  );
}
