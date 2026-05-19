import { createClient as createSupabaseClient } from '@/lib/supabase/server';

function extractStoragePath(url: string, bucket: string) {
  let normalized = url;

  try {
    if (/^https?:\/\//i.test(url)) {
      normalized = new URL(url).pathname;
    }
  } catch {
    normalized = url;
  }

  normalized = normalized.replace(/^\/+/, '');
  normalized = normalized.replace(new RegExp(`^storage/v1/object/(?:public|sign)/${bucket}/`), '');
  normalized = normalized.replace(new RegExp(`^${bucket}/`), '');

  return normalized;
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
