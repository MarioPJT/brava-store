-- Prevent anonymous users from reaching private warehouse data through the Data API.
revoke all on public.shipping_origins from anon, public;
grant select, insert, update, delete on public.shipping_origins to authenticated;
