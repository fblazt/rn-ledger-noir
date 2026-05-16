export const DATABASE_NAME = 'fintrack.db';
export const CURRENT_SCHEMA_VERSION = 1;

export const MIGRATIONS: Record<number, string> = {
  1: `
    create table if not exists local_profiles (
      id text primary key,
      email text,
      display_name text,
      currency text not null default 'IDR',
      created_at text not null,
      updated_at text not null,
      sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
      synced_at text
    );

    create table if not exists local_categories (
      id text primary key,
      user_id text not null,
      name text not null,
      type text not null check (type in ('income', 'expense')),
      icon text,
      color text,
      is_default integer not null default 0 check (is_default in (0, 1)),
      created_at text not null,
      updated_at text not null,
      deleted_at text,
      sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
      synced_at text,
      unique (id, user_id)
    );

    create unique index if not exists local_categories_active_name_type_uidx
    on local_categories(user_id, lower(name), type)
    where deleted_at is null;

    create index if not exists local_categories_user_id_idx on local_categories(user_id);
    create index if not exists local_categories_user_type_idx on local_categories(user_id, type);
    create index if not exists local_categories_sync_status_idx on local_categories(sync_status);

    create table if not exists local_transactions (
      id text primary key,
      user_id text not null,
      type text not null check (type in ('income', 'expense')),
      amount integer not null check (amount > 0),
      category_id text not null,
      note text,
      transaction_date text not null,
      created_at text not null,
      updated_at text not null,
      deleted_at text,
      sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
      synced_at text,
      unique (id, user_id),
      foreign key (category_id, user_id)
        references local_categories(id, user_id)
    );

    create index if not exists local_transactions_user_id_idx on local_transactions(user_id);
    create index if not exists local_transactions_user_date_idx on local_transactions(user_id, transaction_date);
    create index if not exists local_transactions_user_category_idx on local_transactions(user_id, category_id);
    create index if not exists local_transactions_user_type_idx on local_transactions(user_id, type);
    create index if not exists local_transactions_sync_status_idx on local_transactions(sync_status);

    create table if not exists local_budgets (
      id text primary key,
      user_id text not null,
      category_id text not null,
      month text not null check (
        month glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
        and cast(substr(month, 6, 2) as integer) between 1 and 12
      ),
      limit_amount integer not null check (limit_amount > 0),
      created_at text not null,
      updated_at text not null,
      deleted_at text,
      sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
      synced_at text,
      unique (id, user_id),
      foreign key (category_id, user_id)
        references local_categories(id, user_id)
    );

    create unique index if not exists local_budgets_active_category_month_uidx
    on local_budgets(user_id, category_id, month)
    where deleted_at is null;

    create index if not exists local_budgets_user_id_idx on local_budgets(user_id);
    create index if not exists local_budgets_user_month_idx on local_budgets(user_id, month);
    create index if not exists local_budgets_sync_status_idx on local_budgets(sync_status);

    create table if not exists local_transaction_attachments (
      id text primary key,
      user_id text not null,
      transaction_id text not null,
      storage_path text unique,
      local_uri text not null,
      file_name text not null,
      mime_type text not null,
      size integer,
      created_at text not null,
      updated_at text not null,
      deleted_at text,
      sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
      synced_at text,
      upload_status text not null default 'local' check (upload_status in ('local', 'uploading', 'uploaded', 'failed')),
      uploaded_at text,
      foreign key (transaction_id, user_id)
        references local_transactions(id, user_id)
        on delete cascade
    );

    create index if not exists local_transaction_attachments_user_id_idx
    on local_transaction_attachments(user_id);

    create index if not exists local_transaction_attachments_user_transaction_idx
    on local_transaction_attachments(user_id, transaction_id);

    create index if not exists local_transaction_attachments_sync_status_idx
    on local_transaction_attachments(sync_status);

    create index if not exists local_transaction_attachments_upload_status_idx
    on local_transaction_attachments(upload_status);

    create table if not exists sync_queue (
      id integer primary key autoincrement,
      entity_type text not null check (entity_type in ('profile', 'category', 'transaction', 'budget', 'transaction_attachment')),
      entity_id text not null,
      operation text not null check (operation in ('insert', 'update', 'delete')),
      payload text not null,
      status text not null default 'pending' check (status in ('pending', 'synced', 'failed')),
      retry_count integer not null default 0,
      last_error text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists sync_queue_status_idx on sync_queue(status);
    create index if not exists sync_queue_entity_idx on sync_queue(entity_type, entity_id);
  `,
};
