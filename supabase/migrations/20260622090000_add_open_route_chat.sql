create table if not exists public.route_chat_threads (
  id uuid primary key default uuid_generate_v4(),
  route_id uuid not null unique references public.official_routes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.route_chat_participants (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.route_chat_threads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(thread_id, profile_id)
);

create table if not exists public.route_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.route_chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(btrim(message)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.route_chat_reports (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.route_chat_threads(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (length(btrim(reason)) > 0),
  status text not null default 'new' check (status in ('new', 'under_review', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_route_chat_threads_route_id on public.route_chat_threads(route_id);
create index if not exists idx_route_chat_participants_thread_id on public.route_chat_participants(thread_id);
create index if not exists idx_route_chat_participants_profile_id on public.route_chat_participants(profile_id);
create index if not exists idx_route_chat_messages_thread_id on public.route_chat_messages(thread_id);
create index if not exists idx_route_chat_messages_created_at on public.route_chat_messages(created_at);
create index if not exists idx_route_chat_reports_thread_id on public.route_chat_reports(thread_id);
create index if not exists idx_route_chat_reports_reported_profile_id on public.route_chat_reports(reported_profile_id);
create index if not exists idx_route_chat_reports_status on public.route_chat_reports(status);

insert into public.route_chat_threads (route_id)
select id
from public.official_routes
on conflict (route_id) do nothing;

create or replace function public.create_route_chat_thread_for_route()
returns trigger
language plpgsql
as $$
begin
  insert into public.route_chat_threads (route_id)
  values (new.id)
  on conflict (route_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trigger_create_route_chat_thread_on_route_insert on public.official_routes;
create trigger trigger_create_route_chat_thread_on_route_insert
after insert on public.official_routes
for each row
execute function public.create_route_chat_thread_for_route();

alter publication supabase_realtime add table public.route_chat_messages;

alter table public.route_chat_threads enable row level security;
alter table public.route_chat_participants enable row level security;
alter table public.route_chat_messages enable row level security;
alter table public.route_chat_reports enable row level security;

grant select on table public.route_chat_threads to authenticated;
grant select, insert on table public.route_chat_participants to authenticated;
grant select, insert on table public.route_chat_messages to authenticated;
grant select, insert, update on table public.route_chat_reports to authenticated;

-- Thread access: active members, assigned drivers, and platform admins can resolve the thread for a route.
drop policy if exists "Route chat threads can be viewed by active members, assigned drivers, and admins" on public.route_chat_threads;
create policy "Route chat threads can be viewed by active members, assigned drivers, and admins"
on public.route_chat_threads
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    join public.official_routes route on route.id = route_chat_threads.route_id
    where actor.user_id = auth.uid()
      and actor.role = 'member'
      and actor.membership_status = 'active'
      and route.status = 'active'
  )
  or exists (
    select 1
    from public.profiles actor
    join public.driver_route_assignments assignment on assignment.driver_id = actor.id
    join public.official_routes route on route.id = assignment.route_id
    where actor.user_id = auth.uid()
      and route_chat_threads.route_id = route.id
      and assignment.route_id = route_chat_threads.route_id
      and assignment.status in ('approved', 'active')
      and route.status = 'active'
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

-- Participants: only active members can join, and they can only join their own profile row.
drop policy if exists "Active members can join route chats" on public.route_chat_participants;
create policy "Active members can join route chats"
on public.route_chat_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles actor
    join public.route_chat_threads thread on thread.id = route_chat_participants.thread_id
    join public.official_routes route on route.id = thread.route_id
    where actor.user_id = auth.uid()
      and actor.id = route_chat_participants.profile_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
      and route.status = 'active'
  )
);

drop policy if exists "Route chat participants can be viewed by participants, drivers, and admins" on public.route_chat_participants;
create policy "Route chat participants can be viewed by participants, drivers, and admins"
on public.route_chat_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_chat_participants.profile_id
  )
  or exists (
    select 1
    from public.route_chat_threads thread
    join public.driver_route_assignments assignment on assignment.route_id = thread.route_id
    join public.profiles actor on actor.user_id = auth.uid()
    where thread.id = route_chat_participants.thread_id
      and assignment.driver_id = actor.id
      and assignment.status in ('approved', 'active')
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

-- Messages: only joined active members, assigned drivers, and admins can read/write the thread.
drop policy if exists "Route chat messages can be viewed by thread participants, drivers, and admins" on public.route_chat_messages;
create policy "Route chat messages can be viewed by thread participants, drivers, and admins"
on public.route_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.route_chat_participants participant
    join public.profiles actor on actor.user_id = auth.uid()
    join public.route_chat_threads thread on thread.id = participant.thread_id
    join public.official_routes route on route.id = thread.route_id
    where participant.thread_id = route_chat_messages.thread_id
      and participant.profile_id = actor.id
      and route.status = 'active'
  )
  or exists (
    select 1
    from public.route_chat_threads thread
    join public.driver_route_assignments assignment on assignment.route_id = thread.route_id
    join public.profiles actor on actor.user_id = auth.uid()
    join public.official_routes route on route.id = thread.route_id
    where thread.id = route_chat_messages.thread_id
      and assignment.driver_id = actor.id
      and assignment.status in ('approved', 'active')
      and route.status = 'active'
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

drop policy if exists "Route chat messages can be sent by joined active members or assigned drivers" on public.route_chat_messages;
create policy "Route chat messages can be sent by joined active members or assigned drivers"
on public.route_chat_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles actor
    join public.route_chat_participants participant on participant.profile_id = actor.id
    join public.route_chat_threads thread on thread.id = participant.thread_id
    join public.official_routes route on route.id = thread.route_id
    where actor.user_id = auth.uid()
      and actor.id = route_chat_messages.sender_id
      and actor.role = 'member'
      and actor.membership_status = 'active'
      and participant.thread_id = route_chat_messages.thread_id
      and route.status = 'active'
  )
  or exists (
    select 1
    from public.profiles actor
    join public.driver_route_assignments assignment on assignment.driver_id = actor.id
    join public.route_chat_threads thread on thread.route_id = assignment.route_id
    join public.official_routes route on route.id = thread.route_id
    where actor.user_id = auth.uid()
      and actor.id = route_chat_messages.sender_id
      and assignment.status in ('approved', 'active')
      and thread.id = route_chat_messages.thread_id
      and route.status = 'active'
  )
);

-- Reports: drivers can report joined participants and admins can read/update them.
drop policy if exists "Route chat reports can be viewed by reporters, drivers, and admins" on public.route_chat_reports;
create policy "Route chat reports can be viewed by reporters, drivers, and admins"
on public.route_chat_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_chat_reports.reporter_id
  )
  or exists (
    select 1
    from public.route_chat_threads thread
    join public.driver_route_assignments assignment on assignment.route_id = thread.route_id
    join public.profiles actor on actor.user_id = auth.uid()
    where thread.id = route_chat_reports.thread_id
      and assignment.driver_id = actor.id
      and assignment.status in ('approved', 'active')
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.role = 'platform_admin'
  )
);

drop policy if exists "Drivers and admins can create route chat reports" on public.route_chat_reports;
create policy "Drivers and admins can create route chat reports"
on public.route_chat_reports
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles actor
    join public.driver_route_assignments assignment on assignment.driver_id = actor.id
    join public.route_chat_threads thread on thread.route_id = assignment.route_id
    join public.official_routes route on route.id = thread.route_id
    where actor.user_id = auth.uid()
      and actor.id = route_chat_reports.reporter_id
      and assignment.status in ('approved', 'active')
      and thread.id = route_chat_reports.thread_id
      and route.status = 'active'
  )
  or exists (
    select 1
    from public.profiles actor
    where actor.user_id = auth.uid()
      and actor.id = route_chat_reports.reporter_id
      and actor.role = 'platform_admin'
  )
);

drop policy if exists "Platform admins can update route chat reports" on public.route_chat_reports;
create policy "Platform admins can update route chat reports"
on public.route_chat_reports
for update
to authenticated
using (
  exists (
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
      and actor.role = 'platform_admin'
  )
);

