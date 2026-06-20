-- Rebuild the driver route application insert policy with fully qualified
-- vehicle capacity references so Postgres does not resolve them ambiguously.

drop policy if exists "Drivers can create own route applications" on public.driver_route_assignments;

create policy "Drivers can create own route applications"
on public.driver_route_assignments
for insert
to authenticated
with check (
  driver_route_assignments.status = 'pending'
  and driver_route_assignments.seats_available > 0
  and exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'driver'
      and actor.id = driver_route_assignments.driver_id
  )
  and exists (
    select 1
    from public.driver_profiles driver_profile
    join public.vehicles vehicle on vehicle.driver_id = driver_profile.id
    join public.official_routes route on route.id = driver_route_assignments.route_id
    where driver_profile.user_id = auth.uid()
      and vehicle.id = driver_route_assignments.vehicle_id
      and vehicle.driver_id = driver_profile.id
      and route.status = 'active'
      and (
        route.vehicle_capacity is null
        or vehicle.seat_capacity is null
        or vehicle.seat_capacity = route.vehicle_capacity
      )
  )
);
