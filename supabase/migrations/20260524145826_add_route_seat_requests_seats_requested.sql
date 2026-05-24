alter table public.route_seat_requests
add column if not exists seats_requested integer not null default 1;
