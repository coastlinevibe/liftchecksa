import { createClient as createSupabaseClient } from '@/lib/supabase/server';

type SupabaseStorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export function extractStoragePath(url: string, bucket: string) {
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
  supabase: Awaited<ReturnType<typeof createSupabaseClient>> | SupabaseStorageClient,
  bucket: string,
  url?: string | null
) {
  if (!url) return '';

  const path = extractStoragePath(url, bucket);
  if (!path) return url;

  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (data?.signedUrl) return data.signedUrl;

  if (/^https?:\/\//i.test(url)) return url;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl || url;
}

export async function resolveRouteMediaUrls<
  T extends {
    profiles?: { profile_photo_url?: string | null } | null;
    vehicles?: { vehicle_photo_url?: string | null } | null;
  },
>(supabase: Awaited<ReturnType<typeof createSupabaseClient>> | SupabaseStorageClient, record: T): Promise<T> {
  const [profilePhotoUrl, vehiclePhotoUrl] = await Promise.all([
    resolveSignedStorageUrl(supabase, 'profile-photos', record.profiles?.profile_photo_url),
    resolveSignedStorageUrl(supabase, 'vehicle-photos', record.vehicles?.vehicle_photo_url),
  ]);

  return {
    ...record,
    profiles: record.profiles
      ? {
          ...record.profiles,
          profile_photo_url: profilePhotoUrl || record.profiles.profile_photo_url,
        }
      : record.profiles,
    vehicles: record.vehicles
      ? {
          ...record.vehicles,
          vehicle_photo_url: vehiclePhotoUrl || record.vehicles.vehicle_photo_url,
        }
      : record.vehicles,
  };
}

export async function resolveRoutesMediaUrls<
  T extends {
    profiles?: { profile_photo_url?: string | null } | null;
    vehicles?: { vehicle_photo_url?: string | null } | null;
  },
>(supabase: Awaited<ReturnType<typeof createSupabaseClient>> | SupabaseStorageClient, routes: T[]): Promise<T[]> {
  return Promise.all(routes.map((route) => resolveRouteMediaUrls(supabase, route)));
}
