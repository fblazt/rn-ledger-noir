export type EntityType = 'profile' | 'category' | 'transaction' | 'budget' | 'transaction_attachment';
export type TransactionType = 'income' | 'expense';
export type SyncOperation = 'insert' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type UploadStatus = 'local' | 'uploading' | 'uploaded' | 'failed';

export type LocalProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
  synced_at: string | null;
};

export type LocalCategory = {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus;
  synced_at: string | null;
};

export type LocalTransaction = {
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
  sync_status: SyncStatus;
  synced_at: string | null;
};

export type LocalBudget = {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus;
  synced_at: string | null;
};

export type LocalTransactionAttachment = {
  id: string;
  user_id: string;
  transaction_id: string;
  storage_path: string | null;
  local_uri: string;
  file_name: string;
  mime_type: string;
  size: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus;
  synced_at: string | null;
  upload_status: UploadStatus;
  uploaded_at: string | null;
};

export type SyncQueueItem = {
  id: number;
  entity_type: EntityType;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  status: SyncStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};
