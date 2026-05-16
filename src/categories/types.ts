import { z } from 'zod';

import type { LocalCategory, TransactionType } from '@/src/db';

export const CATEGORY_COLORS = ['#36D399', '#FBBF24', '#FB7185', '#60A5FA', '#A78BFA', '#F97316'] as const;

export const categoryFormSchema = z.object({
  color: z.string().min(1),
  icon: z.string().trim().min(1, 'Enter an icon label.'),
  name: z.string().trim().min(1, 'Enter a category name.').max(40, 'Use 40 characters or fewer.'),
  type: z.enum(['income', 'expense']),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export type CategoryType = TransactionType;

export type Category = LocalCategory;

export type RemoteCategory = {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RemoteCategoryPayload = Omit<RemoteCategory, 'created_at' | 'updated_at' | 'deleted_at'> & {
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};
