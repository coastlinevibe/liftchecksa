import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CreditCard, Receipt, Shield, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSettingsBackHref } from '../_lib';
import { formatMembershipExpiry, getMembershipExpiry, getPlanLabel } from '@/lib/membership';

function membershipLabel(type?: string | null) {
  return getPlanLabel(type);
}

export default async function MembershipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, membership_type, membership_status, membership_expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('provider_plan, provider_expires_at, provider_next_payment_at, provider_payment_reference, provider_payment_amount, provider_payment_status, provider_payment_proof_url, provider_last_paid_at, verification_status')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_reference, amount, status, plan_type, created_at, activated_at, expires_at, proof_url, proof_image')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const backHref = getSettingsBackHref(profile?.role, !!driverProfile);
  const isDriver = profile?.role === 'driver' || !!driverProfile;
  const planType = isDriver ? driverProfile?.provider_plan : profile?.membership_type;
  const latestPayment = payments?.[0] ?? null;
  const expiry = isDriver
    ? driverProfile?.provider_next_payment_at || driverProfile?.provider_expires_at
    : getMembershipExpiry(profile, latestPayment);
  const membershipActive =
    profile?.membership_status === 'active' ||
    driverProfile?.provider_payment_status === 'approved' ||
    driverProfile?.verification_status === 'approved' ||
    latestPayment?.status === 'approved';
  const paymentProof = isDriver
    ? driverProfile?.provider_payment_proof_url || latestPayment?.proof_url || latestPayment?.proof_image
    : latestPayment?.proof_url || latestPayment?.proof_image;
  const paymentReference = isDriver
    ? driverProfile?.provider_payment_reference || latestPayment?.payment_reference
    : latestPayment?.payment_reference;
  const paymentAmount = isDriver
    ? driverProfile?.provider_payment_amount || latestPayment?.amount
    : latestPayment?.amount;
  const lastPaidAt = isDriver
    ? driverProfile?.provider_last_paid_at || latestPayment?.activated_at || latestPayment?.created_at
    : latestPayment?.activated_at || latestPayment?.created_at;
  const needsPaymentProof = !membershipActive && !!(isDriver ? driverProfile : latestPayment) && !paymentProof;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href={backHref} className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Membership</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 rounded-full p-3">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
              <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">{membershipLabel(planType)}</div>
              <div className="text-xs text-slate-600">
                {profile?.membership_status || driverProfile?.provider_payment_status || driverProfile?.verification_status || 'pending'}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <span className="text-xs text-slate-600">Plan</span>
              <span className="text-sm font-semibold text-slate-900">{membershipLabel(planType)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <span className="text-xs text-slate-600">Expiry</span>
              <span className="text-sm font-semibold text-slate-900">
                {expiry ? formatMembershipExpiry(expiry) : 'Not set'}
              </span>
            </div>
            {isDriver ? (
              <>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs text-slate-600">Reference</span>
                  <span className="text-sm font-semibold text-slate-900 font-mono">{paymentReference || 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs text-slate-600">Amount</span>
                  <span className="text-sm font-semibold text-slate-900">R{paymentAmount || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs text-slate-600">Last Paid</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {lastPaidAt ? formatMembershipExpiry(lastPaidAt) : 'Not set'}
                  </span>
                </div>
              </>
            ) : null}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <span className="text-xs text-slate-600">Account Type</span>
              <span className="text-sm font-semibold text-slate-900">
                {isDriver ? 'Driver' : 'Member'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Payment Status</h2>
          </div>

          {payments && payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.payment_reference} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{payment.payment_reference}</div>
                      <div className="text-xs text-slate-600">
                        R{payment.amount} • {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-emerald-600">{payment.status}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No payment records found.</p>
          )}
        </div>

        {needsPaymentProof && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Receipt className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-bold text-amber-900 mb-1">Need to upload proof?</div>
                <p className="text-xs text-amber-800 mb-3">
                  Upload your subscription proof so the team can activate your account faster.
                </p>
                <Link
                  href="/payment/upload"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  <Upload className="w-4 h-4" />
                  Upload Proof
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
