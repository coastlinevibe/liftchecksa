create or replace function public.get_route_assignment_public_details(p_assignment_id uuid)
returns table (
  driver_name text,
  vehicle_plate text
)
language sql
security definer
set search_path = public
as $$
  select
    nullif(trim(concat_ws(' ', p.first_name, p.surname)), '') as driver_name,
    v.licence_plate as vehicle_plate
  from public.driver_route_assignments a
  join public.profiles p on p.id = a.driver_id
  left join public.vehicles v on v.id = a.vehicle_id
  where a.id = p_assignment_id;
$$;

grant execute on function public.get_route_assignment_public_details(uuid) to anon, authenticated;
