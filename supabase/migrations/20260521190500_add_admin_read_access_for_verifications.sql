alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;

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
      and admin_profile.role in ('platform_admin', 'group_admin')
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
      and admin_profile.role in ('platform_admin', 'group_admin')
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
      and admin_profile.role in ('platform_admin', 'group_admin')
  )
);
