import { z } from 'zod';

import type { LocalTransaction, TransactionType } from '@/src/db';

export const transactionFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]*$/, 'Enter a whole rupiah amount above zero.'),
  categoryId: z.string().min(1, 'Choose a category.'),
  note: z.string().trim().max(140, 'Use 140 characters or fewer.').optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format.'),
  type: z.enum(['income', 'expense']),
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
export type TransactionTypeFilter = TransactionType | 'all';

export type TransactionListFilters = {
  categoryId?: string;
  month: string;
  query?: string;
  type?: TransactionTypeFilter;
};

export type TransactionWithCategory = LocalTransaction & {
  category_color: string | null;
  category_icon: string | null;
  category_name: string;
};

export type RemoteTransaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  note: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RemoteTransactionPayload = Omit<RemoteTransaction, 'created_at' | 'updated_at' | 'deleted_at'> & {
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};
