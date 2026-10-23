"use client";

import { useCallback, useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import TransactionForm, {
  emptyTransactionForm,
  formatAmountInput,
  type TransactionFormValues,
} from "@/components/transaction-form";
import { ApiError } from "@/lib/api";
import {
  formatDate,
  formatRupiah,
  currentMonth,
  todayJakarta,
} from "@/lib/format";
import { getCategories } from "@/lib/services/categories";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
  type TransactionPayload,
} from "@/lib/services/transactions";
import type { Category, TransactionType } from "@/types/category";
import type {
  Transaction,
  TransactionFilter,
  TransactionListMeta,
} from "@/types/transaction";

type TypeFilter = "ALL" | TransactionType;

const EMPTY_META: TransactionListMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

export default function TransactionListPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<TransactionListMeta>(EMPTY_META);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);

  const [formValues, setFormValues] = useState<TransactionFormValues>(
    emptyTransactionForm("")
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filter: TransactionFilter = {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(type === "ALL" ? {} : { type }),
      ...(categoryId ? { categoryId } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
      page,
    };

    try {
      const result = await getTransactions(filter);
      setRows(result.data);
      setMeta(result.meta);
    } catch (err) {
      setRows([]);
      setMeta(EMPTY_META);
      setError(
        err instanceof ApiError ? err.message : "Gagal memuat transaksi."
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, type, categoryId, q, page]);

  useEffect(() => {
    const today = todayJakarta();
    setFrom(`${currentMonth()}-01`);
    setFormValues((current) =>
      current.date === "" ? { ...current, date: today } : current
    );
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [load, ready]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function applyFilter(update: () => void) {
    update();
    setPage(1);
  }

  function resetFilter() {
    setFrom(`${currentMonth()}-01`);
    setTo("");
    setType("ALL");
    setCategoryId("");
    setQ("");
    setPage(1);
  }

  async function handleSubmit(payload: TransactionPayload) {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    setNotice(null);

    try {
      if (editingId) {
        await updateTransaction(editingId, payload);
        setNotice("Transaksi berhasil diperbarui.");
        setEditingId(null);
      } else {
        await createTransaction(payload);
        setNotice("Transaksi berhasil disimpan.");
      }

      setFormValues(
        emptyTransactionForm(payload.date || todayJakarta())
      );
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Gagal menyimpan transaksi."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: Transaction) {
    setNotice(null);
    setFormError(null);
    setEditingId(row.id);
    setFormValues({
      date: row.date,
      type: row.type,
      categoryId: row.category.id,
      amount: formatAmountInput(row.amount),
      note: row.note ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormError(null);
    setFormValues(emptyTransactionForm(todayJakarta()));
  }

  async function handleDelete(row: Transaction) {
    const confirmed = window.confirm(
      `Hapus transaksi ${formatDate(row.date)} — ${row.category.name} — ` +
        `${formatRupiah(row.amount)}${row.note ? ` (${row.note})` : ""}?`
    );
    if (!confirmed) return;

    setError(null);
    setNotice(null);

    try {
      await deleteTransaction(row.id);
      setNotice("Transaksi berhasil dihapus.");
      if (editingId === row.id) cancelEdit();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menghapus transaksi."
      );
    }
  }

  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <>
      <AppNav />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Transaksi Kas
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Kas masuk &amp; keluar Masjid Manbaul Khoir.
          </p>
        </div>

        {notice && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            {notice}
          </p>
        )}

        <TransactionForm
          categories={categories}
          saving={saving}
          editingId={editingId}
          initialValues={formValues}
          onSubmit={handleSubmit}
          onCancel={cancelEdit}
        />

        {formError && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {formError}
          </p>
        )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void load();
        }}
        className="grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Dari tanggal
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => applyFilter(() => setFrom(e.target.value))}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Sampai tanggal
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => applyFilter(() => setTo(e.target.value))}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Jenis
          </span>
          <select
            value={type}
            onChange={(e) => applyFilter(() => setType(e.target.value as TypeFilter))}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="ALL">Semua</option>
            <option value="MASUK">Masuk</option>
            <option value="KELUAR">Keluar</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Kategori
          </span>
          <select
            value={categoryId}
            onChange={(e) => applyFilter(() => setCategoryId(e.target.value))}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Semua kategori</option>
            {categories
              .filter((category) => type === "ALL" || category.type === type)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </label>

        <label className="block text-sm sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Cari keterangan
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="cth. karpet, listrik, infaq jumat"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Cari
          </button>
          <button
            type="button"
            onClick={resetFilter}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-zinc-600 dark:text-zinc-400">Memuat transaksi…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          Belum ada transaksi pada rentang ini.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Tanggal</th>
                <th className="px-4 py-2 font-medium">Kategori</th>
                <th className="px-4 py-2 font-medium">Keterangan</th>
                <th className="px-4 py-2 text-right font-medium">Masuk</th>
                <th className="px-4 py-2 text-right font-medium">Keluar</th>
                <th className="px-4 py-2 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                    {row.category.name}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {row.note ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-emerald-700 dark:text-emerald-400">
                    {row.type === "MASUK" ? formatRupiah(row.amount) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-rose-700 dark:text-rose-400">
                    {row.type === "KELUAR" ? formatRupiah(row.amount) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        disabled={saving}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row)}
                        disabled={saving}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            Menampilkan {start}–{end} dari {meta.total} transaksi
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={meta.page <= 1 || loading}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sebelumnya
            </button>
            <span className="px-1 py-1.5">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
              disabled={meta.page >= meta.totalPages || loading}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
