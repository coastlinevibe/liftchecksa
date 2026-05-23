alter table public.route_chats enable row level security;

drop policy if exists "Route chat participants can send messages" on public.route_chats;
create policy "Route chat participants can send messages"
on public.route_chats
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles sender_profile
    where sender_profile.user_id = auth.uid()
      and sender_profile.id = route_chats.sender_id
      and (
        (
          sender_profile.role = 'member'
          and sender_profile.membership_status = 'active'
          and exists (
            select 1
            from public.driver_route_assignments assignment
            where assignment.id = route_chats.assignment_id
              and assignment.route_id = route_chats.route_id
              and assignment.status in ('approved', 'active')
              and assignment.driver_id = route_chats.receiver_id
          )
        )
        or (
          sender_profile.role = 'driver'
          and exists (
            select 1
            from public.driver_route_assignments assignment
            join public.official_routes route on route.id = assignment.route_id
            where assignment.id = route_chats.assignment_id
              and assignment.route_id = route_chats.route_id
              and assignment.status in ('approved', 'active')
              and assignment.driver_id = sender_profile.id
              and route.status = 'active'
          )
          and exists (
            select 1
            from public.profiles receiver_profile
            where receiver_profile.id = route_chats.receiver_id
              and receiver_profile.role = 'member'
              and receiver_profile.membership_status = 'active'
          )
        )
      )
  )
);
