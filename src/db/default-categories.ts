import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso } from '@/src/lib/date';

import type { LocalCategory, TransactionType } from './types';

export type DefaultCategoryTemplate = {
  key: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
};

export const DEFAULT_CATEGORY_TEMPLATES: DefaultCategoryTemplate[] = [
  { key: 'salary', name: 'Salary', type: 'income', icon: 'banknote', color: '#36D399' },
  { key: 'bonus', name: 'Bonus', type: 'income', icon: 'sparkles', color: '#FBBF24' },
  { key: 'food', name: 'Food', type: 'expense', icon: 'utensils', color: '#FB7185' },
  { key: 'transport', name: 'Transport', type: 'expense', icon: 'train-front', color: '#60A5FA' },
  { key: 'bills', name: 'Bills', type: 'expense', icon: 'receipt', color: '#A78BFA' },
  { key: 'shopping', name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#F97316' },
];

export async function seedDefaultCategories(db: SQLiteDatabase, userId: string) {
  const createdAt = nowIso();

  for (const template of DEFAULT_CATEGORY_TEMPLATES) {
    const id = await createDefaultCategoryId(userId, template.key);

    await db.runAsync(
      `insert or ignore into local_categories (
        id,
        user_id,
        name,
        type,
        icon,
        color,
        is_default,
        created_at,
        updated_at,
        sync_status
      ) values (?, ?, ?, ?, ?, ?, 1, ?, ?, 'pending')`,
      id,
      userId,
      template.name,
      template.type,
      template.icon,
      template.color,
      createdAt,
      createdAt
    );
  }
}

export async function listDefaultCategories(db: SQLiteDatabase, userId: string) {
  return db.getAllAsync<LocalCategory>(
    `select *
     from local_categories
     where user_id = ? and is_default = 1 and deleted_at is null
     order by type, name`,
    userId
  );
}

async function createDefaultCategoryId(userId: string, categoryKey: string) {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `local-category:${userId}:${categoryKey}`
  );
  const variantNibble = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `${variantNibble}${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}
