-- Limit anonymous checkout attempts without storing raw client IP addresses.
create table public.checkout_rate_limits (
  address_hash text primary key check (length(address_hash)=64),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count > 0)
);

alter table public.checkout_rate_limits enable row level security;
revoke all on public.checkout_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.checkout_rate_limits to service_role;

create or replace function public.consume_checkout_rate_limit(p_address_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_count integer;
begin
  if p_address_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into public.checkout_rate_limits as current_window(address_hash,window_started_at,attempt_count)
  values(p_address_hash,now(),1)
  on conflict(address_hash) do update set
    window_started_at=case when current_window.window_started_at < now()-interval '10 minutes' then now() else current_window.window_started_at end,
    attempt_count=case when current_window.window_started_at < now()-interval '10 minutes' then 1 else current_window.attempt_count+1 end
  returning attempt_count into v_attempt_count;

  delete from public.checkout_rate_limits where window_started_at < now()-interval '1 day' and address_hash<>p_address_hash;
  return v_attempt_count <= 5;
end;
$$;

revoke all on function public.consume_checkout_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_checkout_rate_limit(text) to service_role;
