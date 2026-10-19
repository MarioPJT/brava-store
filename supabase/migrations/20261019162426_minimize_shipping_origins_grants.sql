-- Remove broad default table grants and allow only the operations used by admins.
revoke all on public.shipping_origins from anon, authenticated, public;
grant select, insert, update, delete on public.shipping_origins to authenticated;
