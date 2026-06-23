import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { resolveSignedStorageUrl } from '@/lib/supabase/storage';
import PaymentCard from './PaymentCard';

type PendingPayment = {
  source?: 'member' | 'driver';
  id: string;
  user_id: string;
  plan_type: string;
  amount: number | string;
  payment_reference: string;
  proof_url?: string | null;
  proof_image?: string | null;
  proof_image_url?: string | null;
  created_at: string;
  profiles?: {
    first_name?: string | null;
    surname?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

function getPendingPaymentKey(payment: Pick<PendingPayment, 'source' | 'user_id' | 'payment_reference' | 'id'>) {
  if (payment.source === 'driver') {
    return `driver:${payment.user_id}:${payment.payment_reference || payment.id}`;
  }

  return `payment:${payment.user_id}:${payment.payment_reference || payment.id}`;
}
async function getPendingPayments() {
  const supabase = await createClient();

  const [{ data: payments }, { data: driverSubscriptions }] = await Promise.all([
    supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .or('proof_url.not.is.null,proof_image.not.is.null')
      .order('created_at', { ascending: false }),
    supabase
      .from('driver_profiles')
      .select('id, user_id, provider_plan, provider_payment_amount, provider_payment_reference, provider_payment_proof_url, provider_payment_status, provider_last_paid_at, provider_next_payment_at, created_at')
      .eq('provider_payment_status', 'pending')
      .not('provider_payment_proof_url', 'is', null)
      .order('created_at', { ascending: false }),
  ]);

  const paymentRows = payments || [];
  const driverRows = driverSubscriptions || [];

  const paymentsWithProfiles = await Promise.all([
    ...paymentRows.map(async (payment: PendingPayment) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, surname, phone, email')
        .eq('user_id', payment.user_id)
        .single();

      const proofImageUrl = await resolveSignedStorageUrl(
        supabase,
        'payment-proofs',
        payment.proof_url || payment.proof_image
      );

      return {
        source: 'member' as const,
        ...payment,
        proof_image_url: proofImageUrl && /^https?:\/\//i.test(proofImageUrl) ? proofImageUrl : null,
        profiles: profile
      };
    }),
    ...driverRows.map(async (driverProfile) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, surname, phone, email')
        .eq('user_id', driverProfile.user_id)
        .single();

      const proofImageUrl = await resolveSignedStorageUrl(
        supabase,
        'payment-proofs',
        driverProfile.provider_payment_proof_url
      );

      return {
        source: 'driver' as const,
        id: driverProfile.id,
        user_id: driverProfile.user_id,
        plan_type: driverProfile.provider_plan,
        amount: driverProfile.provider_payment_amount || 0,
        payment_reference: driverProfile.provider_payment_reference || '',
        proof_url: driverProfile.provider_payment_proof_url || null,
        proof_image_url: proofImageUrl && /^https?:\/\//i.test(proofImageUrl) ? proofImageUrl : null,
        proof_image: null,
        created_at: driverProfile.created_at,
        provider_payment_status: driverProfile.provider_payment_status,
        provider_payment_proof_url: driverProfile.provider_payment_proof_url,
        provider_next_payment_at: driverProfile.provider_next_payment_at,
        profiles: profile,
      } as PendingPayment;
    }),
  ]);

  const pendingByKey = new Map<string, PendingPayment>();

  for (const payment of paymentsWithProfiles) {
    const driverMirrorKey =
      payment.source === 'driver'
        ? `payment:${payment.user_id}:${payment.payment_reference || payment.id}`
        : `driver:${payment.user_id}:${payment.payment_reference || payment.id}`;
    const ownKey = getPendingPaymentKey(payment);
    const existing = pendingByKey.get(ownKey) || pendingByKey.get(driverMirrorKey);

    if (!existing || payment.source === 'driver') {
      pendingByKey.set(ownKey, payment);
      if (pendingByKey.has(driverMirrorKey)) {
        pendingByKey.delete(driverMirrorKey);
      }
    }
  }

  return Array.from(pendingByKey.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default async function AdminPaymentsPage() {
  const payments = await getPendingPayments();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <Link href="/admin" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to admin
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Payment Review</h1>
          <p className="text-xs text-slate-600">{payments.length} pending proof{payments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-6xl mx-auto">
        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((payment: PendingPayment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-base font-semibold text-slate-900 mb-1">No pending payments</h3>
            <p className="text-sm text-slate-600">All payments have been reviewed</p>
          </div>
        )}
      </div>
    </div>
  );
}
