"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category } from "@/types/category";
import type { TransactionPayload } from "@/lib/services/transactions";

/**
 * Pemisah ribuan untuk input nominal: buang semua non-digit lalu kelompokkan
 * 3 digit dari kanan — 500000 → "500.000", ketik lanjutan pun selalu benar.
 * ponytail: rupiah di input form dibatasi integer (sen praktis tidak dipakai);
 * bila butuh desimal, ganti jadi mask yang membedakan titik ribuan & desimal.
 */
export function formatAmountInput(value: string): string {
  return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function emptyTransactionForm(today: string) {
  return {
    date: today,
    type: "MASUK" as TransactionPayload["type"],
    categoryId: "",
    amount: "",
    note: "",
  };
}

export type TransactionFormValues = ReturnType<typeof emptyTransactionForm>;

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

interface TransactionFormProps {
  categories: Category[];
  saving: boolean;
  /** Diisi saat mode edit; kosong = form tambah baru. */
  editingId?: string | null;
  initialValues?: TransactionFormValues;
  onSubmit: (payload: TransactionPayload) => void;
  onCancel?: () => void;
}

export default function TransactionForm({
  categories,
  saving,
  editingId,
  initialValues,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [form, setForm] = useState<TransactionFormValues>(
    initialValues ?? emptyTransactionForm("")
  );

  // Sinkronkan dengan nilai luar (awal mount, masuk mode edit, atau reset).
  useEffect(() => {
    if (initialValues) {
      setForm(initialValues);
    }
  }, [initialValues]);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type]
  );

  // Kategori lama mungkin tidak cocok ketika jenis dipindah — reset pilihan.
  useEffect(() => {
    const stillValid = availableCategories.some(
      (category) => category.id === form.categoryId
    );
    if (!stillValid && form.categoryId !== "") {
      setForm((current) => ({ ...current, categoryId: "" }));
    }
  }, [availableCategories, form.categoryId]);

  const switchType = (type: TransactionPayload["type"]) => {
    setForm((current) => ({ ...current, type }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    onSubmit({
      date: form.date,
      type: form.type,
      categoryId: form.categoryId,
      // `form.amount` berisi teks berpemisah ribuan — kirim angka murni.
      amount: form.amount.replace(/\D/g, ""),
      note: form.note.trim() === "" ? null : form.note.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {editingId ? "Edit Transaksi" : "Input Cepat"}
        </h2>
        {editingId && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Batal edit
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Tanggal
          </span>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Jenis
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => switchType("MASUK")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                form.type === "MASUK"
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchType("KELUAR")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                form.type === "KELUAR"
                  ? "bg-rose-600 text-white"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Keluar
            </button>
          </div>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Kategori
          </span>
          <select
            required
            value={form.categoryId}
            onChange={(e) =>
              setForm((c) => ({ ...c, categoryId: e.target.value }))
            }
            className={inputClass}
          >
            <option value="">Pilih kategori…</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Nominal (Rp)
          </span>
          <input
            type="text"
            required
            inputMode="numeric"
            placeholder="0"
            value={form.amount}
            onChange={(e) =>
              setForm((c) => ({
                ...c,
                amount: formatAmountInput(e.target.value),
              }))
            }
            className={inputClass}
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-zinc-700 dark:text-zinc-300">
            Keterangan (opsional)
          </span>
          <input
            type="text"
            maxLength={255}
            placeholder="cth. donasi karpet, listrik bulanan"
            value={form.note}
            onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))}
            className={inputClass}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving
          ? "Menyimpan…"
          : editingId
            ? "Simpan Perubahan"
            : "Simpan Transaksi"}
      </button>
    </form>
  );
}
