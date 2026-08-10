-- Community verification: "I hear this" / "It's quiet now".
-- One stance per device per report; proximity + age checks in the RPC.
-- Run on the dedicated Bruit Supabase project after 0005.

alter table public.noise_reports
  add column if not exists hear_count integer not null default 0,
  add column if not exists quiet_count integer not null default 0;

alter table public.noise_reports
  drop constraint if exists noise_reports_hear_count_check;

alter table public.noise_reports
  add constraint noise_reports_hear_count_check
  check (hear_count >= 0);

alter table public.noise_reports
  drop constraint if exists noise_reports_quiet_count_check;

alter table public.noise_reports
  add constraint noise_reports_quiet_count_check
  check (quiet_count >= 0);

create table if not exists public.noise_verifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.noise_reports (id) on delete cascade,
  device_id text not null,
  kind text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint noise_verifications_kind_check
    check (kind in ('hear', 'quiet')),
  constraint noise_verifications_lat_check
    check (lat is null or (lat >= -90 and lat <= 90)),
  constraint noise_verifications_lng_check
    check (lng is null or (lng >= -180 and lng <= 180)),
  constraint noise_verifications_report_device_unique
    unique (report_id, device_id)
);

create index if not exists noise_verifications_device_created_idx
  on public.noise_verifications (device_id, created_at desc);

create index if not exists noise_verifications_report_kind_idx
  on public.noise_verifications (report_id, kind);

alter table public.noise_verifications enable row level security;

revoke all on public.noise_verifications from anon, authenticated;

create or replace function public.refresh_noise_report_verification_counts(
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.noise_reports r
  set
    hear_count = (
      select count(*)::integer
      from public.noise_verifications v
      where v.report_id = p_report_id and v.kind = 'hear'
    ),
    quiet_count = (
      select count(*)::integer
      from public.noise_verifications v
      where v.report_id = p_report_id and v.kind = 'quiet'
    )
  where r.id = p_report_id;
end;
$$;

create or replace function public.noise_verification_distance_m(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371000.0 * 2.0 * asin(
    least(
      1.0,
      sqrt(
        power(sin(radians(p_lat2 - p_lat1) / 2.0), 2) +
        cos(radians(p_lat1)) * cos(radians(p_lat2)) *
        power(sin(radians(p_lng2 - p_lng1) / 2.0), 2)
      )
    )
  );
$$;

drop function if exists public.verify_noise_report(text, uuid, text, double precision, double precision);

create or replace function public.verify_noise_report(
  p_device_id text,
  p_report_id uuid,
  p_kind text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.noise_reports;
  existing public.noise_verifications;
  v_kind text;
  v_device text;
  distance_m double precision;
  recent_count integer;
  action text;
  my_kind text;
begin
  v_device := nullif(trim(coalesce(p_device_id, '')), '');
  if v_device is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_device_id');
  end if;

  if p_report_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_report_id');
  end if;

  v_kind := nullif(trim(coalesce(p_kind, '')), '');
  if v_kind is null or v_kind not in ('hear', 'quiet') then
    return jsonb_build_object('ok', false, 'error', 'invalid_kind');
  end if;

  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    return jsonb_build_object('ok', false, 'error', 'invalid_coordinates');
  end if;

  perform pg_advisory_xact_lock(hashtext('verify:' || v_device));

  select *
  into report_row
  from public.noise_reports
  where id = p_report_id;

  if report_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if report_row.device_id = v_device then
    return jsonb_build_object('ok', false, 'error', 'own_report');
  end if;

  if report_row.created_at < now() - interval '7 days' then
    return jsonb_build_object('ok', false, 'error', 'report_too_old');
  end if;

  select *
  into existing
  from public.noise_verifications
  where report_id = p_report_id
    and device_id = v_device;

  -- Tap again to undo — no proximity check required to clear.
  if existing.id is not null and existing.kind = v_kind then
    delete from public.noise_verifications
    where id = existing.id;
    action := 'cleared';
    my_kind := null;
  else
    distance_m := public.noise_verification_distance_m(
      p_lat, p_lng, report_row.lat, report_row.lng
    );

    if distance_m > 300 then
      return jsonb_build_object(
        'ok', false,
        'error', 'too_far',
        'distance_m', round(distance_m)::integer
      );
    end if;

    select count(*)::integer
    into recent_count
    from public.noise_verifications
    where device_id = v_device
      and created_at > now() - interval '1 hour'
      and (existing.id is null or id <> existing.id);

    if recent_count >= 30 then
      return jsonb_build_object(
        'ok', false,
        'error', 'rate_limited',
        'retry_after_seconds', 3600
      );
    end if;

    if existing.id is null then
      insert into public.noise_verifications (
        report_id, device_id, kind, lat, lng
      )
      values (
        p_report_id, v_device, v_kind, p_lat, p_lng
      );
      action := 'created';
    else
      update public.noise_verifications
      set
        kind = v_kind,
        lat = p_lat,
        lng = p_lng,
        updated_at = now()
      where id = existing.id;
      action := 'updated';
    end if;

    my_kind := v_kind;
  end if;

  perform public.refresh_noise_report_verification_counts(p_report_id);

  select *
  into report_row
  from public.noise_reports
  where id = p_report_id;

  return jsonb_build_object(
    'ok', true,
    'action', action,
    'my_kind', my_kind,
    'report', jsonb_build_object(
      'id', report_row.id,
      'lat', report_row.lat,
      'lng', report_row.lng,
      'category', report_row.category,
      'intensity', report_row.intensity,
      'db_avg', report_row.db_avg,
      'db_peak', report_row.db_peak,
      'hear_count', report_row.hear_count,
      'quiet_count', report_row.quiet_count,
      'created_at', report_row.created_at
    )
  );
end;
$$;

grant execute on function public.verify_noise_report(
  text, uuid, text, double precision, double precision
) to anon, authenticated;

drop function if exists public.list_my_noise_verifications(text);

create or replace function public.list_my_noise_verifications(
  p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device text;
begin
  v_device := nullif(trim(coalesce(p_device_id, '')), '');
  if v_device is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_device_id');
  end if;

  return jsonb_build_object(
    'ok', true,
    'verifications', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'report_id', v.report_id,
            'kind', v.kind,
            'created_at', v.created_at,
            'updated_at', v.updated_at
          )
          order by v.updated_at desc
        )
        from (
          select report_id, kind, created_at, updated_at
          from public.noise_verifications
          where device_id = v_device
          order by updated_at desc
          limit 200
        ) v
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.list_my_noise_verifications(text)
  to anon, authenticated;

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
            'hear_count', r.hear_count,
            'quiet_count', r.quiet_count,
            'created_at', r.created_at
          )
          order by r.created_at desc
        )
        from (
          select
            id, lat, lng, category, intensity,
            db_avg, db_peak, hear_count, quiet_count, created_at
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
      'hear_count', new_row.hear_count,
      'quiet_count', new_row.quiet_count,
      'created_at', new_row.created_at
    )
  );
end;
$$;

grant execute on function public.create_noise_report(
  text, double precision, double precision, text, text, double precision, double precision
) to anon, authenticated;
