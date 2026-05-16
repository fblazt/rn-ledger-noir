import type { LocalCategory } from '@/src/db';
import { supabase } from '@/src/lib/supabase';

import type { RemoteCategory, RemoteCategoryPayload } from './types';

export function toRemoteCategoryPayload(category: LocalCategory): RemoteCategoryPayload {
  return {
    color: category.color,
    icon: category.icon,
    id: category.id,
    is_default: category.is_default === 1,
    name: category.name,
    type: category.type,
    user_id: category.user_id,
  };
}

export function fromRemoteCategory(category: RemoteCategory): LocalCategory {
  return {
    color: category.color,
    created_at: category.created_at,
    deleted_at: category.deleted_at,
    icon: category.icon,
    id: category.id,
    is_default: category.is_default ? 1 : 0,
    name: category.name,
    sync_status: 'synced',
    synced_at: category.updated_at,
    type: category.type,
    updated_at: category.updated_at,
    user_id: category.user_id,
  };
}

export async function listRemoteCategories(userId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data as RemoteCategory[];
}

export async function upsertRemoteCategory(category: LocalCategory) {
  const { data, error } = await supabase
    .from('categories')
    .upsert(toRemoteCategoryPayload(category))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as RemoteCategory;
}
