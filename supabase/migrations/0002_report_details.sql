-- Add report detail fields for the Apple-style report drawer.
-- Run on the dedicated Bruit Supabase project after 0001.

alter table public.noise_reports
  add column if not exists category text not null default 'other',
  add column if not exists intensity text not null default 'loud';

alter table public.noise_reports
  drop constraint if exists noise_reports_category_check;

alter table public.noise_reports
  add constraint noise_reports_category_check
  check (category in ('traffic', 'construction', 'party', 'animals', 'industry', 'other'));

alter table public.noise_reports
  drop constraint if exists noise_reports_intensity_check;

alter table public.noise_reports
  add constraint noise_reports_intensity_check
  check (intensity in ('moderate', 'loud', 'very_loud', 'extreme'));

drop function if exists public.create_noise_report(text, double precision, double precision);

create or replace function public.create_noise_report(
  p_device_id text,
  p_lat double precision,
  p_lng double precision,
  p_category text default 'other',
  p_intensity text default 'loud'
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
  v_category text;
  v_intensity text;
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

  v_category := coalesce(nullif(trim(p_category), ''), 'other');
  v_intensity := coalesce(nullif(trim(p_intensity), ''), 'loud');

  if v_category not in ('traffic', 'construction', 'party', 'animals', 'industry', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_category');
  end if;

  if v_intensity not in ('moderate', 'loud', 'very_loud', 'extreme') then
    return jsonb_build_object('ok', false, 'error', 'invalid_intensity');
  end if;

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

  insert into public.noise_reports (device_id, lat, lng, category, intensity)
  values (trim(p_device_id), p_lat, p_lng, v_category, v_intensity)
  returning * into new_row;

  return jsonb_build_object(
    'ok', true,
    'report', jsonb_build_object(
      'id', new_row.id,
      'lat', new_row.lat,
      'lng', new_row.lng,
      'category', new_row.category,
      'intensity', new_row.intensity,
      'created_at', new_row.created_at
    )
  );
end;
$$;

grant execute on function public.create_noise_report(text, double precision, double precision, text, text)
  to anon, authenticated;
