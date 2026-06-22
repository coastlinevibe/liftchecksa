-- Persist whether an admin called the driver before approving the application.
alter table public.driver_route_assignments
add column if not exists phone_call_verified boolean not null default false;
