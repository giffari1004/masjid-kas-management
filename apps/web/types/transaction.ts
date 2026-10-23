import type { TransactionType } from "@/types/category";

export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  /** Tanggal murni `YYYY-MM-DD` dari API. */
  date: string;
  type: TransactionType;
  /** Nominal desimal sebagai string, mis. `"150000.00"` — jaga presisi. */
  amount: string;
  note: string | null;
  categoryId: string;
  category: TransactionCategory;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: TransactionListMeta;
}

export interface TransactionFilter {
  from?: string;
  to?: string;
  type?: TransactionType;
  categoryId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface TransactionSummary {
  balance: string;
  totalIncome: string;
  totalExpense: string;
  currentMonth: {
    month: string;
    income: string;
    expense: string;
    balance: string;
  };
  today: { income: string; expense: string };
  lastFriday: { date: string; income: string };
  recentTransactions: Transaction[];
}
