import api from "@/lib/api";
import type {
  Transaction,
  TransactionFilter,
  TransactionListResponse,
  TransactionSummary,
} from "@/types/transaction";

export interface TransactionPayload {
  date: string;
  type: "MASUK" | "KELUAR";
  categoryId: string;
  /** Angka mentah tanpa pemisah, mis. `"150000"` atau `"150000.50"`. */
  amount: string;
  note?: string | null;
}

export async function getTransactions(
  filter: TransactionFilter = {}
): Promise<TransactionListResponse> {
  const { data } = await api.get<TransactionListResponse>("/api/transactions", {
    params: filter,
  });
  return data;
}

export async function getTransactionSummary(): Promise<TransactionSummary> {
  const { data } = await api.get<TransactionSummary>(
    "/api/transactions/summary"
  );
  return data;
}

export async function createTransaction(
  payload: TransactionPayload
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/api/transactions", payload);
  return data;
}

export async function updateTransaction(
  id: string,
  payload: TransactionPayload
): Promise<Transaction> {
  const { data } = await api.put<Transaction>(
    `/api/transactions/${id}`,
    payload
  );
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/api/transactions/${id}`);
}
