"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getCategories } from "@/lib/services/categories";
import type { Category } from "@/types/category";

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Gagal memuat kategori.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-zinc-600 dark:text-zinc-400">Memuat kategori…</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (categories.length === 0) return <p className="text-zinc-600 dark:text-zinc-400">Belum ada kategori.</p>;

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {categories.map((category) => (
        <li key={category.id} className="flex items-center justify-between px-4 py-2 text-sm">
          <span className="text-zinc-900 dark:text-zinc-100">{category.name}</span>
          <span
            className={
              category.type === "MASUK"
                ? "rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            }
          >
            {category.type}
          </span>
        </li>
      ))}
    </ul>
  );
}
