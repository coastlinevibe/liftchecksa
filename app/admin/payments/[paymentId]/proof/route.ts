import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveSignedStorageUrl } from '@/lib/supabase/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
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

  if (profile?.role !== 'platform_admin' && profile?.role !== 'group_admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .select('proof_url, proof_image')
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    return new NextResponse('Not found', { status: 404 });
  }

  const proofSource = payment.proof_url || payment.proof_image;
  const signedProofUrl = await resolveSignedStorageUrl(
    supabase,
    'payment-proofs',
    proofSource
  );

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
