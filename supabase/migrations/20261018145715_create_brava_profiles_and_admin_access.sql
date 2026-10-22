-- This version is already recorded as applied in the BRAVA Store project; keep the ID in sync.
-- BRAVA account profiles and guarded admin RPCs for this standalone project.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Mi cuenta',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select, insert on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own customer profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id and role = 'user');

create policy "Users can update their own profile name"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- The function must inspect auth.users, which is intentionally not exposed to clients.
-- It lives in a non-exposed schema, checks the caller's profile role, and returns only
-- the user fields needed by the BRAVA admin screen.
create or replace function private.admin_list_users()
returns table (id uuid, email text, display_name text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;

  return query
  select u.id, u.email::text, p.display_name, p.role, u.created_at
  from auth.users u
  join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_list_users()
returns table (id uuid, email text, display_name text, role text, created_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from private.admin_list_users(); $$;

create or replace function private.admin_set_user_role(target_user_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;
  if target_role not in ('user', 'admin') then
    raise exception 'Invalid role';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Administrators cannot change their own role';
  end if;
  update public.profiles set role = target_role, updated_at = now()
  where id = target_user_id;
  if not found then raise exception 'User profile not found'; end if;
end;
$$;

create or replace function public.admin_set_user_role(target_user_id uuid, target_role text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_set_user_role(target_user_id, target_role); $$;

revoke all on function private.admin_list_users() from public, anon, authenticated;
revoke all on function private.admin_set_user_role(uuid, text) from public, anon, authenticated;
grant execute on function private.admin_list_users() to authenticated;
grant execute on function private.admin_set_user_role(uuid, text) to authenticated;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
