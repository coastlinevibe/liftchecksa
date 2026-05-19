import { createClient as createSupabaseClient } from '@/lib/supabase/server';

function extractStoragePath(url: string, bucket: string) {
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
  if (publicMatch?.[1]) return publicMatch[1].replace(new RegExp(`^${bucket}\\/`), '');

  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
  if (signedMatch?.[1]) return signedMatch[1].replace(new RegExp(`^${bucket}\\/`), '');

  return '';
}

export async function resolvePublicStorageUrl(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  bucket: string,
  url?: string | null
) {
  if (!url) return '';

  const path = extractStoragePath(url, bucket);
  if (!path) return url;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl || url;
}
