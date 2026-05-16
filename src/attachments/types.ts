import type { LocalTransactionAttachment } from '@/src/db';

export type AttachmentSource = {
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  uri: string;
};

export type Attachment = LocalTransactionAttachment;

export type RemoteTransactionAttachment = {
  id: string;
  user_id: string;
  transaction_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RemoteTransactionAttachmentPayload = Omit<
  RemoteTransactionAttachment,
  'created_at' | 'updated_at' | 'deleted_at'
> & {
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};
