import { File } from 'expo-file-system';

import type { LocalTransactionAttachment } from '@/src/db';
import { supabase } from '@/src/lib/supabase';

import type { RemoteTransactionAttachment, RemoteTransactionAttachmentPayload } from './types';

export function toRemoteAttachmentPayload(attachment: LocalTransactionAttachment): RemoteTransactionAttachmentPayload {
  if (!attachment.storage_path) {
    throw new Error('Attachment storage path is missing.');
  }

  return {
    created_at: attachment.created_at,
    deleted_at: attachment.deleted_at,
    file_name: attachment.file_name,
    id: attachment.id,
    mime_type: attachment.mime_type,
    size: attachment.size,
    storage_path: attachment.storage_path,
    transaction_id: attachment.transaction_id,
    updated_at: attachment.updated_at,
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
    upload_status: localUri ? 'uploaded' : 'uploaded',
    uploaded_at: null,
    user_id: attachment.user_id,
  };
}

export async function createReceiptSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(storagePath, 60 * 5);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function uploadReceiptFile(attachment: LocalTransactionAttachment) {
  if (!attachment.storage_path) {
    throw new Error('Attachment storage path is missing.');
  }

  if (!attachment.local_uri) {
    throw new Error('Local receipt file is missing.');
  }

  const file = new File(attachment.local_uri);

  if (!file.exists) {
    throw new Error('Local receipt file no longer exists.');
  }

  const { error } = await supabase.storage.from('receipts').upload(attachment.storage_path, await file.arrayBuffer(), {
    contentType: attachment.mime_type,
    upsert: true,
  });

  if (error) {
    throw error;
  }
}

export async function listRemoteAttachmentsForUser(userId: string) {
  const { data, error } = await supabase
    .from('transaction_attachments')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data as RemoteTransactionAttachment[];
}

