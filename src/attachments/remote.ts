import type { LocalTransactionAttachment } from '@/src/db';
import { supabase } from '@/src/lib/supabase';

import type { RemoteTransactionAttachment, RemoteTransactionAttachmentPayload } from './types';

export function toRemoteAttachmentPayload(attachment: LocalTransactionAttachment): RemoteTransactionAttachmentPayload {
  if (!attachment.storage_path) {
    throw new Error('Attachment storage path is missing.');
  }

  return {
    file_name: attachment.file_name,
    id: attachment.id,
    mime_type: attachment.mime_type,
    size: attachment.size,
    storage_path: attachment.storage_path,
    transaction_id: attachment.transaction_id,
    user_id: attachment.user_id,
  };
}

export function fromRemoteAttachment(attachment: RemoteTransactionAttachment, localUri = ''): LocalTransactionAttachment {
  return {
    created_at: attachment.created_at,
    deleted_at: attachment.deleted_at,
    file_name: attachment.file_name,
    id: attachment.id,
    local_uri: localUri,
    mime_type: attachment.mime_type,
    size: attachment.size,
    storage_path: attachment.storage_path,
    sync_status: 'synced',
    synced_at: attachment.updated_at,
    transaction_id: attachment.transaction_id,
    updated_at: attachment.updated_at,
    upload_status: localUri ? 'uploaded' : 'local',
    uploaded_at: null,
    user_id: attachment.user_id,
  };
}

export async function listRemoteAttachments(userId: string, transactionId: string) {
  const { data, error } = await supabase
    .from('transaction_attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_id', transactionId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as RemoteTransactionAttachment[];
}

export async function upsertRemoteAttachment(attachment: LocalTransactionAttachment) {
  const { data, error } = await supabase
    .from('transaction_attachments')
    .upsert(toRemoteAttachmentPayload(attachment))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as RemoteTransactionAttachment;
}
