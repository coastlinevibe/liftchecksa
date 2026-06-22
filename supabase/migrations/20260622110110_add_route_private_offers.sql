create table if not exists public.route_private_offers (
  id uuid primary key default uuid_generate_v4(),
  route_id uuid not null references public.official_routes(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  message text not null check (length(btrim(message)) > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'expired')),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_route_private_offers_one_pending_per_passenger_route
  on public.route_private_offers(route_id, passenger_id)
  where status = 'pending';

create index if not exists idx_route_private_offers_route_id on public.route_private_offers(route_id);
create index if not exists idx_route_private_offers_passenger_id on public.route_private_offers(passenger_id);
create index if not exists idx_route_private_offers_driver_id on public.route_private_offers(driver_id);
create index if not exists idx_route_private_offers_status on public.route_private_offers(status);
create index if not exists idx_route_private_offers_created_at on public.route_private_offers(created_at);

create or replace function public.is_valid_private_offer_driver(input_user_id uuid, input_route_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles actor
    join public.driver_profiles driver_profile on driver_profile.user_id = actor.user_id
    join public.driver_route_assignments assignment on assignment.driver_id = actor.id
    join public.official_routes route on route.id = assignment.route_id
    where actor.user_id = input_user_id
      and actor.role = 'driver'
      and actor.membership_status = 'active'
      and driver_profile.id_status = 'approved'
      and driver_profile.vehicle_status = 'approved'
      and coalesce(driver_profile.is_suspended, false) = false
      and assignment.route_id = input_route_id
      and assignment.status in ('approved', 'active')
      and route.status = 'active'
  );
$$;

create or replace function public.enforce_route_private_offer_updates()
returns trigger
language plpgsql
as $$
begin
  if new.route_id <> old.route_id
    or new.passenger_id <> old.passenger_id
    or new.driver_id <> old.driver_id
    or new.amount <> old.amount
    or new.message <> old.message
    or new.created_at <> old.created_at then
    raise exception 'Private offer fields are immutable';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('accepted', 'declined', 'withdrawn', 'expired') then
    if new.responded_at is null then
      new.responded_at := now();
    end if;
    return new;
  end if;

  raise exception 'Invalid private offer status transition';
end;
$$;

drop trigger if exists trigger_enforce_route_private_offer_updates on public.route_private_offers;
create trigger trigger_enforce_route_private_offer_updates
before update on public.route_private_offers
for each row
execute function public.enforce_route_private_offer_updates();

alter table public.route_private_offers enable row level security;

grant select, insert, update on table public.route_private_offers to authenticated;

drop policy if exists 'Route private offers can be viewed by passengers, drivers, and admins' on public.route_private_offers;
create policy 'Route private offers can be viewed by passengers, drivers, and admins'
on public.route_private_offers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_private_offers.passenger_id
  )
  or public.is_valid_private_offer_driver(auth.uid(), route_private_offers.route_id)
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

drop policy if exists 'Active members can create private offers for their assigned route drivers' on public.route_private_offers;
create policy 'Active members can create private offers for their assigned route drivers'
on public.route_private_offers
for insert
to authenticated
with check (
  status = 'pending'
  and exists (
    select 1
    from public.profiles actor
    join public.official_routes route on route.id = route_private_offers.route_id
    join public.driver_route_assignments assignment on assignment.route_id = route_private_offers.route_id
    where actor.user_id = auth.uid()
      and actor.id = route_private_offers.passenger_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
      and route.status = 'active'
      and assignment.driver_id = route_private_offers.driver_id
      and assignment.status in ('approved', 'active')
      and public.is_valid_private_offer_driver((select actor.user_id from public.profiles actor where actor.user_id = auth.uid() limit 1), route_private_offers.route_id)
  )
);

drop policy if exists 'Passengers can withdraw their own pending private offers' on public.route_private_offers;
create policy 'Passengers can withdraw their own pending private offers'
on public.route_private_offers
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_private_offers.passenger_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
  )
  and route_private_offers.status = 'pending'
)
with check (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_private_offers.passenger_id
  )
  and route_private_offers.status = 'withdrawn'
);

drop policy if exists 'Assigned drivers can respond to pending private offers' on public.route_private_offers;
create policy 'Assigned drivers can respond to pending private offers'
on public.route_private_offers
for update
to authenticated
using (
  route_private_offers.status = 'pending'
  and public.is_valid_private_offer_driver(auth.uid(), route_private_offers.route_id)
  and exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_private_offers.driver_id
  )
)
with check (
  route_private_offers.status in ('accepted', 'declined')
  and exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_private_offers.driver_id
  )
);
