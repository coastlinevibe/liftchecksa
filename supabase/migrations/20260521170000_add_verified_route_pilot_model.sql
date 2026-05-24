create table if not exists public.official_routes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  start_area text not null,
  end_area text not null,
  route_type text not null default 'work_commute',
  status text not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_routes_status_check check (status in ('draft', 'active', 'paused'))
);

create table if not exists public.route_stops (
  id uuid primary key default uuid_generate_v4(),
  route_id uuid not null references public.official_routes(id) on delete cascade,
  stop_order integer not null,
  stop_name text not null,
  area text,
  notes text,
  estimated_morning_time time,
  estimated_return_time time,
  is_start boolean not null default false,
  is_end boolean not null default false,
  created_at timestamptz not null default now(),
  constraint route_stops_route_id_stop_order_key unique (route_id, stop_order),
  constraint route_stops_stop_order_check check (stop_order >= 1)
);

create table if not exists public.driver_route_assignments (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  route_id uuid not null references public.official_routes(id) on delete cascade,
  status text not null default 'pending',
  seats_available integer not null default 1,
  days_active text[] not null default array['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[],
  weekly_price numeric(10,2),
  single_route_price numeric(10,2),
  admin_notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint driver_route_assignments_status_check check (status in ('pending', 'approved', 'rejected', 'paused', 'active', 'suspended')),
  constraint driver_route_assignments_seats_check check (seats_available > 0)
);

create table if not exists public.route_seat_requests (
  id uuid primary key default uuid_generate_v4(),
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  route_id uuid not null references public.official_routes(id) on delete cascade,
  pickup_stop_id uuid not null references public.route_stops(id) on delete restrict,
  dropoff_stop_id uuid not null references public.route_stops(id) on delete restrict,
  requested_days text[] not null default array['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[],
  request_type text not null default 'weekly',
  preferred_morning_time time,
  preferred_return_time time,
  status text not null default 'pending',
  matched_assignment_id uuid references public.driver_route_assignments(id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_seat_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled', 'matched', 'confirmed'))
);

create table if not exists public.ride_payment_ledger (
  id uuid primary key default uuid_generate_v4(),
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  route_id uuid not null references public.official_routes(id) on delete cascade,
  seat_request_id uuid references public.route_seat_requests(id) on delete set null,
  amount numeric(10,2) not null,
  platform_fee numeric(10,2) not null default 0,
  driver_amount numeric(10,2) not null default 0,
  payment_period text not null default 'weekly',
  payment_method text not null default 'manual_eft',
  payment_provider text,
  provider_reference text,
  status text not null default 'pending',
  payout_status text not null default 'not_due',
  proof_url text,
  paid_at timestamptz,
  confirmed_at timestamptz,
  payout_due_at timestamptz,
  payout_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_unlocks (
  id uuid primary key default uuid_generate_v4(),
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  route_id uuid not null references public.official_routes(id) on delete cascade,
  seat_request_id uuid references public.route_seat_requests(id) on delete cascade,
  passenger_accepted boolean not null default false,
  driver_accepted boolean not null default false,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contact_unlocks_seat_request_key unique (seat_request_id)
);

create index if not exists idx_official_routes_status on public.official_routes(status);
create index if not exists idx_official_routes_start_area on public.official_routes(start_area);
create index if not exists idx_official_routes_end_area on public.official_routes(end_area);
create index if not exists idx_route_stops_route_id on public.route_stops(route_id);
create index if not exists idx_route_stops_area on public.route_stops(area);
create index if not exists idx_driver_route_assignments_route_id on public.driver_route_assignments(route_id);
create index if not exists idx_driver_route_assignments_driver_id on public.driver_route_assignments(driver_id);
create index if not exists idx_driver_route_assignments_vehicle_id on public.driver_route_assignments(vehicle_id);
create index if not exists idx_route_seat_requests_route_id on public.route_seat_requests(route_id);
create index if not exists idx_route_seat_requests_passenger_id on public.route_seat_requests(passenger_id);
create index if not exists idx_route_seat_requests_status on public.route_seat_requests(status);
create index if not exists idx_ride_payment_ledger_passenger_id on public.ride_payment_ledger(passenger_id);
create index if not exists idx_ride_payment_ledger_driver_id on public.ride_payment_ledger(driver_id);
create index if not exists idx_ride_payment_ledger_route_id on public.ride_payment_ledger(route_id);
create index if not exists idx_contact_unlocks_passenger_id on public.contact_unlocks(passenger_id);
create index if not exists idx_contact_unlocks_driver_id on public.contact_unlocks(driver_id);

create or replace function public.touch_pilot_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_official_routes_touch_updated_at on public.official_routes;
create trigger trigger_official_routes_touch_updated_at
before update on public.official_routes
for each row
execute function public.touch_pilot_updated_at();

drop trigger if exists trigger_route_seat_requests_touch_updated_at on public.route_seat_requests;
create trigger trigger_route_seat_requests_touch_updated_at
before update on public.route_seat_requests
for each row
execute function public.touch_pilot_updated_at();

create or replace function public.validate_route_seat_request_stops()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pickup_order integer;
  dropoff_order integer;
  pickup_route_id uuid;
  dropoff_route_id uuid;
begin
  select route_id, stop_order
    into pickup_route_id, pickup_order
  from public.route_stops
  where id = new.pickup_stop_id;

  select route_id, stop_order
    into dropoff_route_id, dropoff_order
  from public.route_stops
  where id = new.dropoff_stop_id;

  if pickup_route_id is null or dropoff_route_id is null then
    raise exception 'Pickup and drop-off stops must exist';
  end if;

  if pickup_route_id <> new.route_id or dropoff_route_id <> new.route_id then
    raise exception 'Pickup and drop-off stops must belong to the selected route';
  end if;

  if pickup_order >= dropoff_order then
    raise exception 'Pickup stop must come before drop-off stop';
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_validate_route_seat_request_stops on public.route_seat_requests;
create trigger trigger_validate_route_seat_request_stops
before insert or update on public.route_seat_requests
for each row
execute function public.validate_route_seat_request_stops();

create or replace function public.touch_contact_unlock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.passenger_accepted and new.driver_accepted and new.unlocked_at is null then
    new.unlocked_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_contact_unlock_touch on public.contact_unlocks;
create trigger trigger_contact_unlock_touch
before insert or update on public.contact_unlocks
for each row
execute function public.touch_contact_unlock();

alter table public.official_routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.driver_route_assignments enable row level security;
alter table public.route_seat_requests enable row level security;
alter table public.ride_payment_ledger enable row level security;
alter table public.contact_unlocks enable row level security;

drop policy if exists "Public can view active official routes" on public.official_routes;
create policy "Public can view active official routes"
on public.official_routes
for select
to anon, authenticated
using (
  status = 'active'
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

drop policy if exists "Platform admins manage official routes" on public.official_routes;
create policy "Platform admins manage official routes"
on public.official_routes
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

drop policy if exists "Public can view route stops for active routes" on public.route_stops;
create policy "Public can view route stops for active routes"
on public.route_stops
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.official_routes route
    where route.id = route_stops.route_id
      and (
        route.status = 'active'
        or exists (
          select 1
          from public.profiles admin_profile
          where admin_profile.user_id = auth.uid()
            and admin_profile.role = 'platform_admin'
        )
      )
  )
);

drop policy if exists "Platform admins manage route stops" on public.route_stops;
create policy "Platform admins manage route stops"
on public.route_stops
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

drop policy if exists "Drivers can view own route assignments" on public.driver_route_assignments;
create policy "Drivers can view own route assignments"
on public.driver_route_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and (
        actor.role = 'platform_admin'
        or actor.role = 'group_admin'
        or actor.id = driver_route_assignments.driver_id
      )
  )
);

drop policy if exists "Platform admins manage driver route assignments" on public.driver_route_assignments;
create policy "Platform admins manage driver route assignments"
on public.driver_route_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

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
      and (
        actor.role = 'platform_admin'
        or actor.role = 'group_admin'
        or actor.id = route_seat_requests.passenger_id
      )
  )
  or exists (
    select 1
    from public.driver_route_assignments assignment
    join public.profiles driver_profile on driver_profile.id = assignment.driver_id
    where assignment.id = route_seat_requests.matched_assignment_id
      and driver_profile.user_id = auth.uid()
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
  )
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
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role in ('platform_admin', 'group_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_seat_requests.passenger_id
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role in ('platform_admin', 'group_admin')
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
      and admin_profile.role in ('platform_admin', 'group_admin')
  )
);

drop policy if exists "Route payment ledger visible to involved users" on public.ride_payment_ledger;
create policy "Route payment ledger visible to involved users"
on public.ride_payment_ledger
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and (
        actor.role in ('platform_admin', 'group_admin')
        or actor.id = ride_payment_ledger.passenger_id
        or actor.id = ride_payment_ledger.driver_id
      )
  )
);

drop policy if exists "Platform admins manage route payments" on public.ride_payment_ledger;
create policy "Platform admins manage route payments"
on public.ride_payment_ledger
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('platform_admin', 'group_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('platform_admin', 'group_admin')
  )
);

drop policy if exists "Contact unlocks visible to involved users" on public.contact_unlocks;
create policy "Contact unlocks visible to involved users"
on public.contact_unlocks
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and (
        actor.role in ('platform_admin', 'group_admin')
        or actor.id = contact_unlocks.passenger_id
        or actor.id = contact_unlocks.driver_id
      )
  )
);

drop policy if exists "Platform admins manage contact unlocks" on public.contact_unlocks;
create policy "Platform admins manage contact unlocks"
on public.contact_unlocks
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('platform_admin', 'group_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('platform_admin', 'group_admin')
  )
);
