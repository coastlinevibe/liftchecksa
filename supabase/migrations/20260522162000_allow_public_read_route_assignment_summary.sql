-- Allow public route browsing to always see assignment seat/price summary.
-- This exposes only rows for active/approved assignments; app UI still controls
-- what fields are rendered publicly.

alter table public.driver_route_assignments enable row level security;
grant usage on schema public to anon, authenticated;
grant select on table public.driver_route_assignments to anon, authenticated;

drop policy if exists "Public can read approved route assignments" on public.driver_route_assignments;
create policy "Public can read approved route assignments"
on public.driver_route_assignments
for select
to anon, authenticated
using (
  status in ('approved', 'active')
  and exists (
    select 1
    from public.official_routes
    where official_routes.id = driver_route_assignments.route_id
      and official_routes.status = 'active'
  )
);
