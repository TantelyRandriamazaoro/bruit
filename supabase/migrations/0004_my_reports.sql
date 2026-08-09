-- Device-scoped list + delete for "My reports" in Activity.
-- Ownership is the client device_id (same trust model as create_noise_report).

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
            'created_at', r.created_at
          )
          order by r.created_at desc
        )
        from (
          select id, lat, lng, category, intensity, created_at
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

create or replace function public.delete_noise_report(
  p_device_id text,
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  if p_device_id is null or length(trim(p_device_id)) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_device_id'
    );
  end if;

  if p_report_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_report_id'
    );
  end if;

  delete from public.noise_reports
  where id = p_report_id
    and device_id = trim(p_device_id)
  returning id into deleted_id;

  if deleted_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', deleted_id
  );
end;
$$;

grant execute on function public.delete_noise_report(text, uuid)
  to anon, authenticated;
