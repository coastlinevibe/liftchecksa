-- Allow approved drivers to create their own pending route applications.
-- The application is stored in driver_route_assignments and later reviewed by admin.

drop policy if exists "Drivers can create own route applications" on public.driver_route_assignments;
create policy "Drivers can create own route applications"
on public.driver_route_assignments
for insert
to authenticated
with check (
  status = 'pending'
  and seats_available > 0
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
    where driver_profile.user_id = auth.uid()
      and vehicle.id = driver_route_assignments.vehicle_id
      and vehicle.driver_id = driver_profile.id
  )
  and exists (
    select 1
    from public.official_routes route
    where route.id = driver_route_assignments.route_id
      and route.status = 'active'
  )
);
