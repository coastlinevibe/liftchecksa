with admin_profile as (
  select id
  from public.profiles
  where role = 'platform_admin'
  order by created_at asc
  limit 1
),
route_upsert as (
  insert into public.official_routes (
    name,
    slug,
    start_area,
    end_area,
    route_type,
    status,
    created_by
  )
  select
    'Kraaifontein to Cape Town CBD',
    'kraaifontein-brackenfell-bellville-parow-cape-town-cbd',
    'Kraaifontein',
    'Cape Town CBD',
    'work_commute',
    'active',
    admin_profile.id
  from admin_profile
  on conflict (slug) do update
    set name = excluded.name,
        start_area = excluded.start_area,
        end_area = excluded.end_area,
        route_type = excluded.route_type,
        status = excluded.status,
        created_by = excluded.created_by,
        updated_at = now()
  returning id
),
route_target as (
  select coalesce(
    (select id from route_upsert limit 1),
    (select id from public.official_routes where slug = 'kraaifontein-brackenfell-bellville-parow-cape-town-cbd' limit 1)
  ) as id
)
insert into public.route_stops (
  route_id,
  stop_order,
  stop_name,
  area,
  notes,
  estimated_morning_time,
  estimated_return_time,
  is_start,
  is_end
)
select route_target.id, stops.stop_order, stops.stop_name, stops.area, stops.notes, stops.estimated_morning_time, stops.estimated_return_time, stops.is_start, stops.is_end
from route_target
cross join (
  values
    (1, 'Kraaifontein', 'Kraaifontein', 'Start of route', time '05:45', time '17:15', true, false),
    (2, 'Brackenfell', 'Brackenfell', 'Second stop', time '05:55', time '17:25', false, false),
    (3, 'Bellville', 'Bellville', 'Third stop', time '06:05', time '17:35', false, false),
    (4, 'Parow', 'Parow', 'Fourth stop', time '06:15', time '17:45', false, false),
    (5, 'Cape Town CBD', 'Cape Town CBD', 'Destination', time '06:30', time '18:00', false, true)
) as stops(stop_order, stop_name, area, notes, estimated_morning_time, estimated_return_time, is_start, is_end)
on conflict (route_id, stop_order) do update
set stop_name = excluded.stop_name,
    area = excluded.area,
    notes = excluded.notes,
    estimated_morning_time = excluded.estimated_morning_time,
    estimated_return_time = excluded.estimated_return_time,
    is_start = excluded.is_start,
    is_end = excluded.is_end;
