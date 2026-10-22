-- Dispatch addresses and contact details are private operational data.
create table public.shipping_origins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  city text not null default '',
  department text not null default '',
  phone text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipping_origins is 'Private addresses for BRAVA shipment preparation; admin access only.';
alter table public.shipping_origins enable row level security;
grant select, insert, update, delete on public.shipping_origins to authenticated;

create policy "Only admins can read shipping origins"
on public.shipping_origins for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Only admins can create shipping origins"
on public.shipping_origins for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Only admins can edit shipping origins"
on public.shipping_origins for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Only admins can delete shipping origins"
on public.shipping_origins for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
