alter table public.profiles enable row level security;

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
      and admin_profile.role in ('group_admin', 'platform_admin')
  )
);
