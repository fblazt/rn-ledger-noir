import { z } from 'zod';

import type { LocalBudget } from '@/src/db';

export const budgetFormSchema = z.object({
  categoryId: z.string().min(1, 'Choose an expense category.'),
  limitAmount: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]*$/, 'Enter a whole rupiah limit above zero.'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a valid month.'),
});

export type BudgetFormInput = z.infer<typeof budgetFormSchema>;

export type BudgetWithUsage = LocalBudget & {
  category_color: string | null;
  category_icon: string | null;
  category_name: string;
  used_amount: number;
  remaining_amount: number;
  usage_percent: number;
};

export type RemoteBudget = {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RemoteBudgetPayload = Omit<RemoteBudget, 'created_at' | 'updated_at' | 'deleted_at'> & {
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};
