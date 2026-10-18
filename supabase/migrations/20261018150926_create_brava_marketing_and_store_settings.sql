-- This version is already recorded as applied in the BRAVA Store project; keep the ID in sync.
create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('Email','Instagram','WhatsApp')),
  audience text not null default 'Todos los clientes',
  objective text not null default '',
  subject text not null default '',
  content text not null default '',
  status text not null default 'draft' check (status in ('draft','ready')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_campaigns enable row level security;
-- Campaign drafts are private; every read and write policy below checks the admin profile.
grant select, insert, update, delete on public.marketing_campaigns to authenticated;

create policy "Only admins can read marketing campaigns"
on public.marketing_campaigns for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Only admins can create marketing campaigns"
on public.marketing_campaigns for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Only admins can edit marketing campaigns"
on public.marketing_campaigns for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Only admins can delete marketing campaigns"
on public.marketing_campaigns for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'BRAVA',
  support_email text not null default '',
  instagram_url text not null default '',
  announcement text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
-- Visitors can read storefront copy, while only admins can change it.
grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;

create policy "Store settings are publicly readable"
on public.store_settings for select to anon, authenticated
using (true);

create policy "Only admins can create store settings"
on public.store_settings for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Only admins can update store settings"
on public.store_settings for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

insert into public.store_settings (id, store_name, support_email, instagram_url, announcement)
values (1, 'BRAVA', '', '', 'Diseño independiente · Hecho para acompañarte')
on conflict (id) do nothing;
