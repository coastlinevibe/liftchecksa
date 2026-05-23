create table if not exists public.route_chats (
  id uuid primary key default uuid_generate_v4(),
  route_id uuid not null references public.official_routes(id) on delete cascade,
  assignment_id uuid not null references public.driver_route_assignments(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

create index if not exists idx_route_chats_route_id on public.route_chats(route_id);
create index if not exists idx_route_chats_assignment_id on public.route_chats(assignment_id);
create index if not exists idx_route_chats_created_at on public.route_chats(created_at);

alter publication supabase_realtime add table public.route_chats;

alter table public.route_chats enable row level security;
grant select, insert on table public.route_chats to authenticated;

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
      and actor.role in ('group_admin', 'platform_admin')
  )
);

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
      and sender_profile.role = 'member'
      and sender_profile.membership_status = 'active'
  )
  and exists (
    select 1
    from public.driver_route_assignments assignment
    join public.official_routes route on route.id = assignment.route_id
    where assignment.id = route_chats.assignment_id
      and assignment.route_id = route_chats.route_id
      and assignment.status in ('approved', 'active')
      and route.status = 'active'
      and assignment.driver_id = route_chats.receiver_id
  )
);
