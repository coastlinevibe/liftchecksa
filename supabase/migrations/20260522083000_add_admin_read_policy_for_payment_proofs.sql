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
      and admin_profile.role in ('platform_admin', 'group_admin')
  )
);
