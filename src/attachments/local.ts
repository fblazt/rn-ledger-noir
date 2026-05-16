import { Directory, File, Paths } from 'expo-file-system';

import { initializeDatabase } from '@/src/db';
import type { LocalTransactionAttachment } from '@/src/db';
import { nowIso } from '@/src/lib/date';
import { createId } from '@/src/lib/id';

import type { AttachmentSource } from './types';

export async function listLocalAttachments(userId: string, transactionId: string) {
  const db = await initializeDatabase();

  return db.getAllAsync<LocalTransactionAttachment>(
    `select *
     from local_transaction_attachments
     where user_id = ?
       and transaction_id = ?
       and deleted_at is null
     order by created_at desc`,
    userId,
    transactionId
  );
}

export async function createLocalAttachment(userId: string, transactionId: string, source: AttachmentSource) {
  const db = await initializeDatabase();
  const transaction = await db.getFirstAsync<{ id: string }>(
    `select id
     from local_transactions
     where id = ? and user_id = ? and deleted_at is null`,
    transactionId,
    userId
  );

  if (!transaction) {
    throw new Error('Save the transaction before adding receipts.');
  }

  const id = createId();
  const mimeType = source.mimeType ?? inferMimeType(source.fileName ?? source.uri);
  const extension = extensionFromMimeType(mimeType) ?? extensionFromName(source.fileName ?? source.uri) ?? 'jpg';
  const fileName = normalizeFileName(source.fileName, id, extension);
  const storagePath = `${userId}/${transactionId}/${id}.${extension}`;
  const timestamp = nowIso();
  const localUri = copyReceiptToDocumentStorage(userId, transactionId, id, extension, source.uri);
  const file = new File(localUri);
  const size = source.fileSize ?? (file.exists ? file.size : null);

  await db.runAsync(
    `insert into local_transaction_attachments (
      id,
      user_id,
      transaction_id,
      storage_path,
      local_uri,
      file_name,
      mime_type,
      size,
      created_at,
      updated_at,
      sync_status,
      upload_status
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'local')`,
    id,
    userId,
    transactionId,
    storagePath,
    localUri,
    fileName,
    mimeType,
    size,
    timestamp,
    timestamp
  );

  return getLocalAttachment(userId, id);
}

export async function deleteLocalAttachment(userId: string, attachmentId: string) {
  const existing = await getLocalAttachment(userId, attachmentId);

  if (!existing) {
    throw new Error('Attachment not found.');
  }

  const db = await initializeDatabase();
  const timestamp = nowIso();

  await db.runAsync(
    `update local_transaction_attachments
     set deleted_at = ?,
         updated_at = ?,
         sync_status = 'pending',
         synced_at = null
     where id = ? and user_id = ? and deleted_at is null`,
    timestamp,
    timestamp,
    attachmentId,
    userId
  );
}

export async function getLocalAttachment(userId: string, attachmentId: string) {
  const db = await initializeDatabase();

  return db.getFirstAsync<LocalTransactionAttachment>(
    `select *
     from local_transaction_attachments
     where id = ? and user_id = ? and deleted_at is null`,
    attachmentId,
    userId
  );
}

function copyReceiptToDocumentStorage(userId: string, transactionId: string, attachmentId: string, extension: string, sourceUri: string) {
  const directory = new Directory(Paths.document, 'receipts', userId, transactionId);
  directory.create({ idempotent: true, intermediates: true });

  const target = new File(directory, `${attachmentId}.${extension}`);
  const source = new File(sourceUri);
  source.copy(target);

  return target.uri;
}

function extensionFromMimeType(mimeType: string) {
  const knownTypes: Record<string, string> = {
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  return knownTypes[mimeType] ?? null;
}

function extensionFromName(name: string) {
  const match = name.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function inferMimeType(name: string) {
  const extension = extensionFromName(name);

  switch (extension) {
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function normalizeFileName(fileName: string | null | undefined, attachmentId: string, extension: string) {
  const trimmed = fileName?.trim();

  if (trimmed) {
    return trimmed.replace(/[^a-zA-Z0-9._-]/g, '-');
  }

  return `receipt-${attachmentId}.${extension}`;
}
