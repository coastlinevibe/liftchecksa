drop policy if exists "Drivers can view own route assignments" on public.driver_route_assignments;

create policy "Drivers can view own route assignments"
on public.driver_route_assignments
for select
to authenticated
using (
  is_platform_admin()
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = public.driver_route_assignments.driver_id
  )
);
