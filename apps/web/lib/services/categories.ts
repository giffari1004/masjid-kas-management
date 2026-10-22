import api from "@/lib/api";
import type { Category, TransactionType } from "@/types/category";

export interface CategoryFilter {
  type?: TransactionType;
}

export async function getCategories(filter?: CategoryFilter): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/api/categories", {
    params: filter?.type ? { type: filter.type } : undefined,
  });
  return data;
}
