import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStoragePath, resolveSignedStorageUrl } from '@/lib/supabase/storage';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ driverProfileId: string }> }
) {
  const { driverProfileId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!isAdminRole(profile?.role) && !isSuperAdminEmail(user.email)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { data: driverProfile, error } = await supabase
    .from('driver_profiles')
    .select('provider_payment_proof_url')
    .eq('id', driverProfileId)
    .single();

  if (error || !driverProfile) {
    return new NextResponse('Not found', { status: 404 });
  }

  const proofSource = driverProfile.provider_payment_proof_url;
  const proofPath = extractStoragePath(proofSource || '', 'payment-proofs');

  if (proofPath) {
    const { data: proofBlob } = await supabase.storage
      .from('payment-proofs')
      .download(proofPath);

    if (proofBlob) {
      const buffer = await proofBlob.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': proofBlob.type || 'application/octet-stream',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
  }

  const signedProofUrl = await resolveSignedStorageUrl(supabase, 'payment-proofs', proofSource);
  if (!signedProofUrl) {
    return new NextResponse('Not found', { status: 404 });
  }

  const imageResponse = await fetch(signedProofUrl);
  if (!imageResponse.ok) {
    return new NextResponse('Not found', { status: 404 });
  }

  const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
  const buffer = await imageResponse.arrayBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
