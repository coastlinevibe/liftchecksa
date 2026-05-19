'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function extractStoragePath(url: string) {
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
  if (publicMatch?.[1]) return publicMatch[1].replace(/^vehicle-photos\//, '');

  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
  if (signedMatch?.[1]) return signedMatch[1].replace(/^vehicle-photos\//, '');

  return '';
}

export default function VehiclePhoto({ photoUrl }: { photoUrl: string }) {
  const [resolvedUrl, setResolvedUrl] = useState(photoUrl);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const storagePath = extractStoragePath(photoUrl);
      if (!storagePath) return;

      const supabase = createClient();
      const { data } = await supabase.storage
        .from('vehicle-photos')
        .createSignedUrl(storagePath, 3600);

      if (!cancelled && data?.signedUrl) {
        setResolvedUrl(data.signedUrl);
      }
    }

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <img
        src={resolvedUrl}
        alt="Vehicle"
        className="block w-full max-w-md object-contain"
        style={{ maxHeight: '360px' }}
      />
    </div>
  );
}
