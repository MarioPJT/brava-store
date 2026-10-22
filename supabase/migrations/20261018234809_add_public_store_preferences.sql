-- Keep storefront preferences together so new public settings do not require
-- a database column for every small presentation or shipping preference.
alter table public.store_settings
  add column if not exists settings_data jsonb not null default '{}'::jsonb;

-- The dashboard exposes this row to visitors, so this object must contain only
-- public preferences and never secrets, payment credentials, or private notes.
alter table public.store_settings
  add constraint store_settings_settings_data_object
  check (jsonb_typeof(settings_data) = 'object');

comment on column public.store_settings.settings_data is
  'Public storefront preferences such as announcement visibility, shipping estimates, catalog visibility, and SEO metadata. Do not store secrets here.';
