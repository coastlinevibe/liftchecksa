import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { resolveSignedStorageUrl } from '@/lib/supabase/storage';
import PaymentCard from './PaymentCard';

type PendingPayment = {
  id: string;
  user_id: string;
  plan_type: string;
  amount: number | string;
  payment_reference: string;
  proof_url?: string | null;
  proof_image?: string | null;
  created_at: string;
  profiles?: {
    first_name?: string | null;
    surname?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

async function getPendingPayments() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .or('proof_url.not.is.null,proof_image.not.is.null')
    .order('created_at', { ascending: false });

  if (!payments) return [];

  // Fetch profiles separately
  const paymentsWithProfiles = await Promise.all(
    payments.map(async (payment: PendingPayment) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, surname, phone, email')
        .eq('user_id', payment.user_id)
        .single();

      const proofSource = payment.proof_url || payment.proof_image;
      const signedPaymentProofUrl = await resolveSignedStorageUrl(
        supabase,
        'payment-proofs',
        proofSource
      );

      return {
        ...payment,
        profiles: profile,
        proof_url: signedPaymentProofUrl,
        proof_image: signedPaymentProofUrl
      };
    })
  );

  return paymentsWithProfiles;
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
          <p className="text-xs text-slate-600">{payments.length} pending payment{payments.length !== 1 ? 's' : ''}</p>
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
