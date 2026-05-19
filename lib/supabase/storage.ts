import { createClient as createSupabaseClient } from '@/lib/supabase/server';

function extractStoragePath(url: string, bucket: string) {
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
  if (publicMatch?.[1]) return publicMatch[1].replace(new RegExp(`^${bucket}\\/`), '');

  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
  if (signedMatch?.[1]) return signedMatch[1].replace(new RegExp(`^${bucket}\\/`), '');

  return '';
}

export async function resolveSignedStorageUrl(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  bucket: string,
  url?: string | null
) {
  if (!url) return '';

  const path = extractStoragePath(url, bucket);
  if (!path) return url;

  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || url;
}
