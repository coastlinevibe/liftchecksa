alter table public.official_routes
add column if not exists vehicle_capacity integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'official_routes_vehicle_capacity_check'
  ) then
    alter table public.official_routes
    add constraint official_routes_vehicle_capacity_check
    check (vehicle_capacity in (4, 5, 7, 10, 12));
  end if;
end $$;

