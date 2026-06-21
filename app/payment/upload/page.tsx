'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Copy, CheckCircle, Building, CreditCard, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getPlanDurationLabel, getPlanLabel } from '@/lib/membership';

type PaymentRecord = {
  id: string;
  payment_reference?: string | null;
  amount?: number | string | null;
  plan_type?: string | null;
  status?: string | null;
  source?: 'member' | 'driver';
  proof_url?: string | null;
  proof_image?: string | null;
  provider_last_paid_at?: string | null;
  provider_next_payment_at?: string | null;
};

function addPlanMonths(baseDate: Date, planType?: string | null) {
  const next = new Date(baseDate);
  if (planType?.includes('monthly')) {
    next.setMonth(next.getMonth() + 1);
  } else if (planType?.includes('quarterly')) {
    next.setMonth(next.getMonth() + 3);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export default function PaymentUploadPage() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentRecord | null>(null);
  const [nextPath, setNextPath] = useState('/dashboard/member');

  const loadPendingPayment = async () => {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select(`
          id,
          provider_plan,
          provider_payment_reference,
          provider_payment_amount,
          provider_payment_status,
          provider_payment_proof_url,
          provider_last_paid_at,
          provider_next_payment_at
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverProfile) {
        setPaymentData({
          id: driverProfile.id,
          payment_reference: driverProfile.provider_payment_reference || null,
          amount: driverProfile.provider_payment_amount ?? null,
          plan_type: driverProfile.provider_plan || null,
          status: driverProfile.provider_payment_status || 'pending',
          source: 'driver',
          proof_url: driverProfile.provider_payment_proof_url || null,
          provider_last_paid_at: driverProfile.provider_last_paid_at || null,
          provider_next_payment_at: driverProfile.provider_next_payment_at || null,
        });
        setNextPath('/dashboard/driver');
        return;
      }

      let { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        const { data: latestPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        data = latestPayment || null;
      }

      if (data) {
        setPaymentData({
          ...(data as PaymentRecord),
          source: 'member',
        });
        setNextPath('/dashboard/member');
      } else {
        setError('No payment record found yet. Return to your dashboard to check your account status.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment details');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPendingPayment();
  }, []);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => {
      window.location.href = nextPath;
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [nextPath, success]);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File must be less than 5MB');
        return;
      }
      setPaymentProof(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = async () => {
    if (!paymentData?.payment_reference) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(paymentData.payment_reference);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = paymentData.payment_reference;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error('Copy failed');
        }
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = async () => {
    if (!paymentProof || !paymentData) return;
    
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const ext = paymentProof.name.split('.').pop() || 'png';
      const safeExt = ext.toLowerCase();
      const uniqueSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const fileName = `${user.id}/${paymentData.payment_reference}-${uniqueSuffix}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentProof, {
          contentType: paymentProof.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        setError('Failed to upload proof: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const proofUrl = fileName;

      if (paymentData.source === 'driver') {
        const nextPaymentAt = addPlanMonths(new Date(), paymentData.plan_type);
        const { error: driverUpdateError } = await supabase
          .from('driver_profiles')
          .update({
            provider_payment_proof_url: proofUrl,
            provider_payment_status: 'pending',
            provider_last_paid_at: new Date().toISOString(),
            provider_next_payment_at: nextPaymentAt.toISOString(),
            provider_expires_at: nextPaymentAt.toISOString(),
          })
          .eq('id', paymentData.id);

        if (driverUpdateError) {
          setError('Failed to update driver subscription: ' + driverUpdateError.message);
          setLoading(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('payments')
          .update({
            proof_url: proofUrl,
            status: 'pending',
            activated_at: new Date().toISOString(),
            expires_at: nextPaymentAt.toISOString(),
          })
          .eq('payment_reference', paymentData.payment_reference || '');

        if (updateError) {
          console.warn('[payment/upload] Failed to mirror driver payment row', updateError.message);
        }

        setNextPath('/dashboard/driver');
        setSuccess(true);
      } else {
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            proof_url: proofUrl,
            proof_image: proofUrl,
          })
          .eq('id', paymentData.id);

        if (updateError) {
          setError('Failed to update payment: ' + updateError.message);
        } else {
          const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

          setNextPath(profile?.role === 'driver' ? '/dashboard/driver' : '/dashboard/member');
          setSuccess(true);
        }
      }

      setLoading(false);
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Proof Submitted!</h1>
          <p className="text-sm text-slate-600 mb-4">
            We&apos;ll review your payment within 24 hours
          </p>
          <p className="text-xs text-slate-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          {error ? (
            <>
              <p className="text-sm font-semibold text-red-600 mb-2">{error}</p>
              <Link href={nextPath} className="text-sm font-semibold text-emerald-600">
                Back to dashboard
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-600">Loading payment details...</p>
          )}
        </div>
      </div>
    );
  }

  const planType = paymentData.plan_type ?? '';
  const planLabel = getPlanLabel(planType);
  const planDurationLabel = getPlanDurationLabel(planType);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/register" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Complete Payment</h1>
          <p className="text-xs text-slate-600">
            {planLabel} - R{paymentData.amount} / {planDurationLabel}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Step 1: Banking Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              1
            </div>
            <h2 className="text-base font-bold text-slate-900">Make EFT Payment</h2>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-slate-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">Bank</div>
                  <div className="text-sm font-semibold text-slate-900">Tyme Bank</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-slate-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">Company Name</div>
                  <div className="text-sm font-semibold text-slate-900">LiftCheck Safety</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-slate-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">Account Number</div>
                  <div className="text-sm font-semibold text-slate-900">51129386380</div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Amount</div>
              <div className="text-2xl font-bold text-emerald-600">R{paymentData.amount}.00</div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-amber-900 mb-1">Payment Reference</div>
                  <div className="text-lg font-bold text-amber-900">{paymentData.payment_reference}</div>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-amber-200 hover:bg-amber-300 rounded-lg flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-amber-900" />
                      <span className="text-xs font-semibold text-amber-900">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-900" />
                      <span className="text-xs font-semibold text-amber-900">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-amber-800">
                <strong>Important:</strong> Use this exact reference for your payment
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Upload Proof */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-slate-300 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              2
            </div>
            <h2 className="text-base font-bold text-slate-900">Upload Proof of Payment</h2>
          </div>

          <div className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            {!proofPreview ? (
              <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-all cursor-pointer">
                <input type="file" onChange={handleProofChange} className="hidden" accept="image/*,.pdf" />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900 mb-1">Click to upload</p>
                <p className="text-xs text-slate-500">PNG, JPG or PDF (max 5MB)</p>
              </label>
            ) : (
              <div className="relative border-2 border-emerald-500 rounded-lg p-2">
                {paymentProof?.type === 'application/pdf' ? (
                  <div className="flex items-center gap-2 p-2">
                    <div className="bg-red-100 p-2 rounded">
                      <span className="text-xs font-bold text-red-600">PDF</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-900">{paymentProof.name}</p>
                      <p className="text-[10px] text-slate-600">{(paymentProof.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={proofPreview}
                    alt="Payment Proof"
                    width={768}
                    height={192}
                    unoptimized
                    className="h-48 w-full rounded object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentProof(null);
                    setProofPreview('');
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-blue-900 mb-1">What to upload</div>
                  <p className="text-xs text-blue-800">
                    Screenshot or photo of your bank statement showing the payment with the reference number visible.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={!paymentProof || loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-semibold"
            >
              {loading ? 'Uploading...' : 'Submit Proof'}
            </button>
          </div>
        </div>

        {/* Step 3: Activation */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-slate-300 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              3
            </div>
            <h2 className="text-base font-bold text-slate-900">Activation</h2>
          </div>

          <p className="text-sm text-slate-600 mb-3">
            Our team will review your payment within 24 hours and activate your membership.
          </p>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div className="text-xs text-slate-700">
                You&apos;ll receive an email confirmation once your account is activated
              </div>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="bg-slate-100 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-600 mb-2">
            Need help with payment?
          </p>
          <Link href="/support" className="text-xs font-semibold text-emerald-600">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
