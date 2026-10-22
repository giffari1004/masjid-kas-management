"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "@/lib/services/categories";
import type { Category, TransactionType } from "@/types/category";

type Filter = "ALL" | TransactionType;

interface FormState {
  id?: string;
  name: string;
  type: TransactionType;
}

const EMPTY_FORM: FormState = { name: "", type: "MASUK" };

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showError = useCallback((err: unknown) => {
    setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
  }, []);

  const load = useCallback(async () => {
    setError(null);

    try {
      const data = await getCategories(
        filter === "ALL" ? undefined : { type: filter }
      );
      setCategories(data);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }, [filter, showError]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    const name = form.name.trim();
    if (!name) {
      setError("Nama kategori wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (form.id) {
        await updateCategory(form.id, { name, type: form.type });
        setNotice(`Kategori "${name}" berhasil diperbarui.`);
      } else {
        await createCategory({ name, type: form.type });
        setNotice(`Kategori "${name}" berhasil ditambahkan.`);
      }

      setForm(null);
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Hapus kategori "${category.name}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    setDeletingId(category.id);
    setError(null);
    setNotice(null);

    try {
      await deleteCategory(category.id);
      setNotice(`Kategori "${category.name}" berhasil dihapus.`);
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setDeletingId(null);
    }
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "ALL", label: "Semua" },
    { value: "MASUK", label: "Masuk" },
    { value: "KELUAR", label: "Keluar" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={
                filter === item.value
                  ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setError(null);
            setNotice(null);
          }}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Tambah Kategori
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {form && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {form.id ? "Edit Kategori" : "Tambah Kategori Baru"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
                Nama
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                required
                placeholder="cth. Infaq Jumat"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
                Jenis
              </span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as TransactionType })
                }
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="MASUK">MASUK</option>
                <option value="KELUAR">KELUAR</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : form.id ? "Simpan Perubahan" : "Tambah"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              disabled={saving}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-zinc-600 dark:text-zinc-400">Memuat kategori…</p>
      ) : categories.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          {filter === "ALL"
            ? "Belum ada kategori."
            : `Belum ada kategori jenis ${filter}.`}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Nama</th>
                <th className="px-4 py-2 font-medium">Jenis</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                    {category.name}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        category.type === "MASUK"
                          ? "rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      }
                    >
                      {category.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {category.isActive ? "Aktif" : "Nonaktif"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            id: category.id,
                            name: category.name,
                            type: category.type,
                          });
                          setError(null);
                          setNotice(null);
                        }}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(category)}
                        disabled={deletingId === category.id}
                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        {deletingId === category.id ? "Menghapus…" : "Hapus"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
