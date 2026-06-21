create unique index if not exists uniq_driver_route_assignments_open_application
on public.driver_route_assignments (driver_id, route_id)
where status in ('pending', 'approved', 'active', 'paused', 'suspended');
