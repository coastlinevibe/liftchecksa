create or replace function public.validate_driver_route_assignment_vehicle_capacity()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  route_vehicle_capacity integer;
  selected_vehicle_capacity integer;
begin
  select official_routes.vehicle_capacity
    into route_vehicle_capacity
  from public.official_routes
  where official_routes.id = new.route_id;

  if route_vehicle_capacity is null then
    raise exception 'Route vehicle seating type not set';
  end if;

  select vehicles.seat_capacity
    into selected_vehicle_capacity
  from public.vehicles
  where vehicles.id = new.vehicle_id;

  if selected_vehicle_capacity is null then
    raise exception 'Vehicle seat capacity not set';
  end if;

  if selected_vehicle_capacity <> route_vehicle_capacity then
    raise exception 'not the correct vehicle seating type';
  end if;

  return new;
end;
$function$;
