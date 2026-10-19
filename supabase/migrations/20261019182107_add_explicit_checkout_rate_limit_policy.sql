create policy "Browser clients cannot access checkout rate limits"
on public.checkout_rate_limits for all to anon, authenticated
using (false)
with check (false);
