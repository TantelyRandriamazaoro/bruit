-- Bruit: noise reports + 30-minute device rate limit
-- Apply to a dedicated Bruit Supabase project only.

create extension if not exists "pgcrypto";

create table if not exists public.noise_reports (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now(),
  constraint noise_reports_lat_check check (lat >= -90 and lat <= 90),
  constraint noise_reports_lng_check check (lng >= -180 and lng <= 180)
);

create index if not exists noise_reports_device_created_idx
  on public.noise_reports (device_id, created_at desc);

create index if not exists noise_reports_created_at_idx
  on public.noise_reports (created_at desc);

alter table public.noise_reports enable row level security;

-- Public read of recent reports for the heatmap (no device_id exposure needed in UI,
-- but column remains selectable; clients should only map lat/lng/created_at).
create policy "Public can read noise reports"
  on public.noise_reports
  for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies: clients must use create_noise_report RPC
-- (security definer bypasses RLS for the insert).
grant select on public.noise_reports to anon, authenticated;

create or replace function public.create_noise_report(
  p_device_id text,
  p_lat double precision,
  p_lng double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  last_report timestamptz;
  new_row public.noise_reports;
  retry_seconds integer;
begin
  if p_device_id is null or length(trim(p_device_id)) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_device_id'
    );
  end if;

  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_coordinates'
    );
  end if;

  -- Serialize reports per device within this transaction
  perform pg_advisory_xact_lock(hashtext(trim(p_device_id)));

  select created_at
  into last_report
  from public.noise_reports
  where device_id = p_device_id
  order by created_at desc
  limit 1;

  if last_report is not null
     and last_report > now() - interval '30 minutes' then
    retry_seconds := greatest(
      1,
      ceil(extract(epoch from (last_report + interval '30 minutes' - now())))::integer
    );

    return jsonb_build_object(
      'ok', false,
      'error', 'rate_limited',
      'retry_after_seconds', retry_seconds
    );
  end if;

  insert into public.noise_reports (device_id, lat, lng)
  values (trim(p_device_id), p_lat, p_lng)
  returning * into new_row;

  return jsonb_build_object(
    'ok', true,
    'report', jsonb_build_object(
      'id', new_row.id,
      'lat', new_row.lat,
      'lng', new_row.lng,
      'created_at', new_row.created_at
    )
  );
end;
$$;

grant execute on function public.create_noise_report(text, double precision, double precision)
  to anon, authenticated;
