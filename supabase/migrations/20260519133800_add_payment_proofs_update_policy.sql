create policy "Allow authenticated updates payment proofs"
on storage.objects
for update
to authenticated
using (bucket_id = 'payment-proofs')
with check (bucket_id = 'payment-proofs');
