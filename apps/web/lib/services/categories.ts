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

export interface CategoryInput {
  name: string;
  type: TransactionType;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await api.post<Category>("/api/categories", input);
  return data;
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput> & { isActive?: boolean }
): Promise<Category> {
  const { data } = await api.put<Category>(`/api/categories/${id}`, input);
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/api/categories/${id}`);
}
