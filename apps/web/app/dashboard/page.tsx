"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { ApiError, clearAuthToken } from "@/lib/api";
import { getCurrentUser } from "@/lib/services/auth";
import { getTransactionSummary } from "@/lib/services/transactions";
import { formatDate, formatRupiah } from "@/lib/format";
import type { AuthUser } from "@/types/auth";
import type { TransactionSummary } from "@/types/transaction";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    clearAuthToken();
    router.replace("/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const onError = (err: unknown) => {
      if (cancelled) return;
      if (err instanceof ApiError && err.status === 401) {
        handleLogout();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Gagal memuat data.");
    };

    getCurrentUser()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(onError);

    getTransactionSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(onError);

    return () => {
      cancelled = true;
    };
  }, [handleLogout]);

  return (
    <>
      <AppNav />
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {user ? `Selamat datang, ${user.name}.` : "Memuat sesi..."}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Saldo Kas</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {summary ? formatRupiah(summary.balance) : "..."}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Masuk {summary ? summary.currentMonth.month : ""}
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              {summary ? formatRupiah(summary.currentMonth.income) : "..."}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Keluar {summary ? summary.currentMonth.month : ""}
            </p>
            <p className="mt-1 text-lg font-semibold text-red-700 dark:text-red-400">
              {summary ? formatRupiah(summary.currentMonth.expense) : "..."}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Transaksi Terbaru
            </h2>
            <Link
              href="/transactions"
              className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Lihat semua
            </Link>
          </div>

          {summary && summary.recentTransactions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Belum ada transaksi.
            </p>
          ) : null}

          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
            {(summary?.recentTransactions ?? []).map((trx) => (
              <li
                key={trx.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-zinc-900 dark:text-zinc-100">
                    {trx.category.name}
                    {trx.note ? ` - ${trx.note}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(trx.date)}
                  </p>
                </div>
                <span
                  className={
                    trx.type === "MASUK"
                      ? "shrink-0 font-medium text-emerald-700 dark:text-emerald-400"
                      : "shrink-0 font-medium text-red-700 dark:text-red-400"
                  }
                >
                  {trx.type === "MASUK" ? "+" : "-"}
                  {formatRupiah(trx.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
