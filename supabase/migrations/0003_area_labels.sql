-- Bruit: cached reverse-geocoded area names for nearby report clusters.
-- Apply to the dedicated Bruit Supabase project only.

create table if not exists public.area_labels (
  cell_key text primary key,
  lat double precision not null,
  lng double precision not null,
  name text not null,
  source text not null default 'nominatim',
  created_at timestamptz not null default now(),
  constraint area_labels_lat_check check (lat >= -90 and lat <= 90),
  constraint area_labels_lng_check check (lng >= -180 and lng <= 180),
  constraint area_labels_name_check check (char_length(trim(name)) > 0)
);

create index if not exists area_labels_created_at_idx
  on public.area_labels (created_at desc);

alter table public.area_labels enable row level security;

create policy "Public can read area labels"
  on public.area_labels
  for select
  to anon, authenticated
  using (true);

-- First-write cache: clients/API may insert a missing cell once.
-- No update/delete for anon — names stay stable after the first lookup.
create policy "Public can insert missing area labels"
  on public.area_labels
  for insert
  to anon, authenticated
  with check (true);

grant select, insert on public.area_labels to anon, authenticated;
