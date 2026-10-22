export type TransactionType = "MASUK" | "KELUAR";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
