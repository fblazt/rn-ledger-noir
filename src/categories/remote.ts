import type { LocalCategory } from '@/src/db';
import type { RemoteCategory, RemoteCategoryPayload } from './types';

export function toRemoteCategoryPayload(category: LocalCategory): RemoteCategoryPayload {
  return {
    color: category.color,
    created_at: category.created_at,
    deleted_at: category.deleted_at,
    icon: category.icon,
    id: category.id,
    is_default: category.is_default === 1,
    name: category.name,
    type: category.type,
    updated_at: category.updated_at,
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

