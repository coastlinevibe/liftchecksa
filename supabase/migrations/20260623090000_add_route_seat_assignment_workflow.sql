-- PR #4 seat request lifecycle and seat assignment

alter table public.route_seat_requests
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists seat_number integer,
  add column if not exists passenger_avatar_url text,
  add column if not exists seat_assigned_by uuid references public.profiles(id) on delete set null,
  add column if not exists seat_assigned_at timestamptz,
  add column if not exists cancellation_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancellation_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reviewed_at timestamptz,
  add column if not exists removed_by uuid references public.profiles(id) on delete set null,
  add column if not exists removed_at timestamptz,
  add column if not exists removed_reason text;

alter table public.route_seat_requests
  drop constraint if exists route_seat_requests_status_check;

alter table public.route_seat_requests
  add constraint route_seat_requests_status_check
  check (status in ('pending', 'approved', 'assigned', 'cancellation_requested', 'rejected', 'cancelled', 'removed', 'matched', 'confirmed'));

alter table public.route_seat_requests
  drop constraint if exists route_seat_requests_seat_number_check;

alter table public.route_seat_requests
  add constraint route_seat_requests_seat_number_check
  check (seat_number is null or seat_number > 0);

create index if not exists idx_route_seat_requests_route_seat_number on public.route_seat_requests(route_id, seat_number);
create index if not exists idx_route_seat_requests_route_status on public.route_seat_requests(route_id, status);

create unique index if not exists idx_route_seat_requests_active_seat_number
  on public.route_seat_requests(route_id, seat_number)
  where seat_number is not null and status in ('approved', 'assigned', 'cancellation_requested');

create or replace function public.can_request_route_seat(p_user_id uuid, p_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles actor
    where actor.user_id = p_user_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
  )
  and exists (
    select 1
    from public.official_routes route
    where route.id = p_route_id
      and route.status = 'active'
  )
  and exists (
    select 1
    from public.driver_route_assignments assignment
    where assignment.route_id = p_route_id
      and assignment.status in ('approved', 'active')
      and assignment.seats_available > 0
  );
$$;

alter table public.route_seat_requests enable row level security;

drop policy if exists "Passengers can view own route requests" on public.route_seat_requests;
create policy "Passengers can view own route requests"
on public.route_seat_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_seat_requests.passenger_id
  )
  or public.is_valid_open_route_chat_driver(auth.uid(), route_seat_requests.route_id)
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

drop policy if exists "Passengers can create own route requests" on public.route_seat_requests;
create policy "Passengers can create own route requests"
on public.route_seat_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_seat_requests.passenger_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
  )
  and public.can_request_route_seat(auth.uid(), route_seat_requests.route_id)
);

drop policy if exists "Passengers can update own route requests" on public.route_seat_requests;
create policy "Passengers can update own route requests"
on public.route_seat_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_seat_requests.passenger_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
  )
  or public.is_valid_open_route_chat_driver(auth.uid(), route_seat_requests.route_id)
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_seat_requests.passenger_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
  )
  or public.is_valid_open_route_chat_driver(auth.uid(), route_seat_requests.route_id)
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

drop policy if exists "Platform admins manage route requests" on public.route_seat_requests;
create policy "Platform admins manage route requests"
on public.route_seat_requests
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

grant execute on function public.can_request_route_seat(uuid, uuid) to authenticated;
