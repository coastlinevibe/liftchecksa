alter table public.vehicles
add column if not exists seat_capacity integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vehicles_seat_capacity_check'
  ) then
    alter table public.vehicles
    add constraint vehicles_seat_capacity_check
    check (seat_capacity in (4, 5, 7, 10, 12));
  end if;
end
$$;
