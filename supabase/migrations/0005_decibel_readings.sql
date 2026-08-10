-- Add measured decibel fields from on-device microphone samples.
-- Run on the dedicated Bruit Supabase project after 0004.

alter table public.noise_reports
  add column if not exists db_avg double precision,
  add column if not exists db_peak double precision;

alter table public.noise_reports
  drop constraint if exists noise_reports_db_avg_check;

alter table public.noise_reports
  add constraint noise_reports_db_avg_check
  check (db_avg is null or (db_avg >= 0 and db_avg <= 140));

alter table public.noise_reports
  drop constraint if exists noise_reports_db_peak_check;

alter table public.noise_reports
  add constraint noise_reports_db_peak_check
  check (db_peak is null or (db_peak >= 0 and db_peak <= 140));

drop function if exists public.create_noise_report(text, double precision, double precision, text, text);
drop function if exists public.create_noise_report(text, double precision, double precision, text, text, double precision, double precision);

create or replace function public.create_noise_report(
  p_device_id text,
  p_lat double precision,
  p_lng double precision,
  p_category text default 'other',
  p_intensity text default 'loud',
  p_db_avg double precision default null,
  p_db_peak double precision default null
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
  v_db_avg double precision;
  v_db_peak double precision;
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
  v_db_avg := p_db_avg;
  v_db_peak := p_db_peak;

  if v_category not in ('traffic', 'construction', 'party', 'animals', 'industry', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_category');
  end if;

  if v_intensity not in ('moderate', 'loud', 'very_loud', 'extreme') then
    return jsonb_build_object('ok', false, 'error', 'invalid_intensity');
  end if;

  if v_db_avg is not null and (v_db_avg < 0 or v_db_avg > 140) then
    return jsonb_build_object('ok', false, 'error', 'invalid_db_avg');
  end if;

  if v_db_peak is not null and (v_db_peak < 0 or v_db_peak > 140) then
    return jsonb_build_object('ok', false, 'error', 'invalid_db_peak');
  end if;

  if v_db_avg is not null and v_db_peak is not null and v_db_peak < v_db_avg then
    v_db_peak := v_db_avg;
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

  insert into public.noise_reports (
    device_id, lat, lng, category, intensity, db_avg, db_peak
  )
  values (
    trim(p_device_id), p_lat, p_lng, v_category, v_intensity, v_db_avg, v_db_peak
  )
  returning * into new_row;

  return jsonb_build_object(
    'ok', true,
    'report', jsonb_build_object(
      'id', new_row.id,
      'lat', new_row.lat,
      'lng', new_row.lng,
      'category', new_row.category,
      'intensity', new_row.intensity,
      'db_avg', new_row.db_avg,
      'db_peak', new_row.db_peak,
      'created_at', new_row.created_at
    )
  );
end;
$$;

grant execute on function public.create_noise_report(
  text, double precision, double precision, text, text, double precision, double precision
) to anon, authenticated;

create or replace function public.list_my_noise_reports(
  p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device_id is null or length(trim(p_device_id)) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_device_id'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'reports', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'lat', r.lat,
            'lng', r.lng,
            'category', r.category,
            'intensity', r.intensity,
            'db_avg', r.db_avg,
            'db_peak', r.db_peak,
            'created_at', r.created_at
          )
          order by r.created_at desc
        )
        from (
          select id, lat, lng, category, intensity, db_avg, db_peak, created_at
          from public.noise_reports
          where device_id = trim(p_device_id)
          order by created_at desc
          limit 100
        ) r
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.list_my_noise_reports(text)
  to anon, authenticated;
