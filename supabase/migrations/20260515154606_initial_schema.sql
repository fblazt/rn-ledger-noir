create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  unique (id, user_id)
);

create unique index categories_active_name_type_uidx
on public.categories(user_id, lower(name), type)
where deleted_at is null;

create index categories_user_id_idx on public.categories(user_id);
create index categories_user_type_idx on public.categories(user_id, type);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount > 0),
  category_id uuid not null,
  note text,
  transaction_date date not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.categories(id, user_id)
);

create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date);
create index transactions_user_category_idx on public.transactions(user_id, category_id);
create index transactions_user_type_idx on public.transactions(user_id, type);

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  category_id uuid not null,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  limit_amount bigint not null check (limit_amount > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.categories(id, user_id)
);

create unique index budgets_active_category_month_uidx
on public.budgets(user_id, category_id, month)
where deleted_at is null;

create index budgets_user_id_idx on public.budgets(user_id);
create index budgets_user_month_idx on public.budgets(user_id, month);

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,

  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size bigint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  foreign key (transaction_id, user_id)
    references public.transactions(id, user_id)
    on delete cascade
);

create index transaction_attachments_user_id_idx
on public.transaction_attachments(user_id);

create index transaction_attachments_user_transaction_idx
on public.transaction_attachments(user_id, transaction_id);

create trigger transaction_attachments_set_updated_at
before update on public.transaction_attachments
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.transaction_attachments enable row level security;

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can select own categories"
on public.categories
for select
using (auth.uid() = user_id);

create policy "Users can insert own categories"
on public.categories
for insert
with check (auth.uid() = user_id);

create policy "Users can update own categories"
on public.categories
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own categories"
on public.categories
for delete
using (auth.uid() = user_id);

create policy "Users can select own transactions"
on public.transactions
for select
using (auth.uid() = user_id);

create policy "Users can insert own transactions"
on public.transactions
for insert
with check (auth.uid() = user_id);

create policy "Users can update own transactions"
on public.transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
on public.transactions
for delete
using (auth.uid() = user_id);

create policy "Users can select own budgets"
on public.budgets
for select
using (auth.uid() = user_id);

create policy "Users can insert own budgets"
on public.budgets
for insert
with check (auth.uid() = user_id);

create policy "Users can update own budgets"
on public.budgets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own budgets"
on public.budgets
for delete
using (auth.uid() = user_id);

create policy "Users can select own transaction attachments"
on public.transaction_attachments
for select
using (auth.uid() = user_id);

create policy "Users can insert own transaction attachments"
on public.transaction_attachments
for insert
with check (auth.uid() = user_id);

create policy "Users can update own transaction attachments"
on public.transaction_attachments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own transaction attachments"
on public.transaction_attachments
for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own receipt files"
on storage.objects
for select
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload own receipt files"
on storage.objects
for insert
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own receipt files"
on storage.objects
for update
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own receipt files"
on storage.objects
for delete
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
