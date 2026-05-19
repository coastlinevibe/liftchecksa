'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type PaymentCardPayment = {
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
  } | null;
};

export default function PaymentCard({ payment }: { payment: PaymentCardPayment }) {
  const router = useRouter();
  const [showProof, setShowProof] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const profile = payment.profiles ?? {
    first_name: 'Unknown',
    surname: 'User',
    phone: '',
  };
  const hasProof = Boolean(payment.proof_url || payment.proof_image);
  const proofUrl = `/admin/payments/${payment.id}/proof`;
  const timeAgo = new Date(payment.created_at).toLocaleDateString('en-ZA', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });

  const handleApprove = async () => {
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // Calculate expiry date based on plan
      const now = new Date();
      const expiresAt = new Date(now);
      
      if (payment.plan_type.includes('monthly')) {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (payment.plan_type.includes('quarterly')) {
        expiresAt.setMonth(expiresAt.getMonth() + 3);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      // Update payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ 
          status: 'approved',
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', payment.id);

      if (paymentError) throw paymentError;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          membership_status: 'active',
          membership_expires_at: expiresAt.toISOString()
        })
        .eq('user_id', payment.user_id);

      if (profileError) throw profileError;

      alert('Payment approved!');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this payment?')) return;

    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', payment.id);

      if (error) throw error;

      alert('Payment rejected');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-slate-900">
              {profile.first_name} {profile.surname}
            </span>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">
              Pending
            </span>
          </div>
          <div className="text-xs text-slate-600 mb-2">{profile.phone}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-600">Plan:</span>
              <span className="font-semibold text-slate-900 ml-1">{payment.plan_type}</span>
            </div>
            <div>
              <span className="text-slate-600">Amount:</span>
              <span className="font-semibold text-emerald-600 ml-1">R{payment.amount}</span>
            </div>
            <div>
              <span className="text-slate-600">Reference:</span>
              <span className="font-semibold text-slate-900 ml-1">{payment.payment_reference}</span>
            </div>
            <div>
              <span className="text-slate-600">Submitted:</span>
              <span className="font-semibold text-slate-900 ml-1">{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proof of Payment */}
      {hasProof && (
        <div className="mb-3">
          <button
            onClick={() => setShowProof(!showProof)}
            className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 mb-2"
          >
            <Eye className="w-4 h-4" />
            {showProof ? 'Hide' : 'View'} Proof of Payment
          </button>
          
          {showProof && (
            <div className="bg-slate-100 rounded-lg p-4">
              <img 
                src={proofUrl} 
                alt="Payment Proof" 
                className="w-full max-w-md rounded-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {loading ? 'Processing...' : 'Approve & Activate'}
        </button>
        <button 
          onClick={handleReject}
          disabled={loading}
          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}
