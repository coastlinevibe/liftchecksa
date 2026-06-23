alter table public.profiles
add column if not exists dashboard_login_count integer not null default 0;
