create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    currency
  ) values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'IDR'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (
  id,
  email,
  display_name,
  currency
)
select
  users.id,
  users.email,
  nullif(users.raw_user_meta_data ->> 'display_name', ''),
  'IDR'
from auth.users
left join public.profiles
  on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;
