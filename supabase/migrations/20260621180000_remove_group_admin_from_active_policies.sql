-- Restrict legacy group_admin policy access to platform_admin only.
-- Forward migration for LiftCheck auth/privacy hardening.

alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.route_chats enable row level security;
alter table public.route_seat_requests enable row level security;
alter table public.driver_route_assignments enable row level security;
alter table public.ride_payment_ledger enable row level security;
alter table public.contact_unlocks enable row level security;

-- Admin verification reads.
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

drop policy if exists "Admins can view all driver profiles" on public.driver_profiles;
create policy "Admins can view all driver profiles"
on public.driver_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

drop policy if exists "Admins can view all vehicles" on public.vehicles;
create policy "Admins can view all vehicles"
on public.vehicles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

-- Payment proof storage.
drop policy if exists "Admins can read payment proofs" on storage.objects;
create policy "Admins can read payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);

-- Route assignments and requests.
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
        or actor.id = driver_route_assignments.driver_id
      )
  )
);

-- keep the manager policy platform_admin-only as originally intended
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
  or exists (
    select 1
    from public.driver_route_assignments assignment
    join public.profiles driver_profile on driver_profile.id = assignment.driver_id
    where assignment.route_id = route_seat_requests.route_id
      and driver_profile.user_id = auth.uid()
      and assignment.status in ('approved', 'active')
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
      and actor.role = 'platform_admin'
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

-- Payments and contact unlocks.
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
        actor.role = 'platform_admin'
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
        actor.role = 'platform_admin'
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

-- Route chat visibility and peer profile access.
drop policy if exists "Route chat participants can read messages" on public.route_chats;
create policy "Route chat participants can read messages"
on public.route_chats
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and (actor.id = route_chats.sender_id or actor.id = route_chats.receiver_id)
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

drop policy if exists "Route chat participants can delete messages" on public.route_chats;
create policy "Route chat participants can delete messages"
on public.route_chats
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and (actor.id = route_chats.sender_id or actor.id = route_chats.receiver_id)
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

drop policy if exists "Route chat participants can view peer profiles" on public.profiles;
create policy "Route chat participants can view peer profiles"
on public.profiles
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.route_chats chat
    join public.profiles actor on actor.user_id = auth.uid()
    where (
      (chat.sender_id = profiles.id and chat.receiver_id = actor.id)
      or (chat.receiver_id = profiles.id and chat.sender_id = actor.id)
    )
  )
  or exists (
    select 1
    from public.route_seat_requests request
    join public.driver_route_assignments assignment on assignment.id = request.matched_assignment_id
    join public.profiles actor on actor.user_id = auth.uid()
    where (
      (request.passenger_id = profiles.id and assignment.driver_id = actor.id)
      or (assignment.driver_id = profiles.id and request.passenger_id = actor.id)
    )
  )
  or exists (
    select 1
    from public.route_seat_requests request
    join public.driver_route_assignments assignment on assignment.route_id = request.route_id
    join public.profiles actor on actor.user_id = auth.uid()
    where request.passenger_id = profiles.id
      and assignment.driver_id = actor.id
      and assignment.status in ('approved', 'active')
  )
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'platform_admin'
  )
);
