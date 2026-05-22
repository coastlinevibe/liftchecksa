'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  driverProfileId: string;
  userId: string;
  paymentId?: string;
}

export default function ApproveRejectButtons({ driverProfileId, userId, paymentId }: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!decision) return;
    
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      if (decision === 'approve') {
        // Get payment details to calculate expiry
        let expiresAt = new Date();
        if (paymentId) {
          const { data: payment } = await supabase
            .from('payments')
            .select('plan_type')
            .eq('id', paymentId)
            .single();

          if (payment) {
            // Calculate expiry based on plan
            if (payment.plan_type.includes('monthly')) {
              expiresAt.setMonth(expiresAt.getMonth() + 1);
            } else if (payment.plan_type.includes('quarterly')) {
              expiresAt.setMonth(expiresAt.getMonth() + 3);
            } else {
              expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            }
          }
        }

        // Update profile membership status with expiry
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            membership_status: 'active',
            membership_expires_at: expiresAt.toISOString()
          })
          .eq('user_id', userId);

        if (profileError) throw profileError;

        // Update driver profile to approved
        const { error: driverError } = await supabase
          .from('driver_profiles')
          .update({ 
            id_status: 'approved',
            verification_status: 'approved'
          })
          .eq('id', driverProfileId);

        if (driverError) throw driverError;

        // Update payment if exists
        if (paymentId) {
          const { error: paymentError } = await supabase
            .from('payments')
            .update({ 
              status: 'approved',
              activated_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString()
            })
            .eq('id', paymentId);

          if (paymentError) throw paymentError;
        }

        alert('Basic registration approved successfully!');
        router.push('/admin');
      } else {
        // Reject
        const { error: driverError } = await supabase
          .from('driver_profiles')
          .update({ 
            id_status: 'rejected',
            verification_status: 'rejected'
          })
          .eq('id', driverProfileId);

        if (driverError) throw driverError;

        if (paymentId) {
          const { error: paymentError } = await supabase
            .from('payments')
            .update({ status: 'rejected' })
            .eq('id', paymentId);

          if (paymentError) throw paymentError;
        }

        alert('Application rejected');
        router.push('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="text-base font-bold text-slate-900 mb-3">Basic Registration Review</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setDecision('approve')}
          className={`p-4 rounded-xl border-2 transition-all ${
            decision === 'approve'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
            decision === 'approve' ? 'text-emerald-500' : 'text-slate-400'
          }`} />
          <div className="text-sm font-semibold text-slate-900">Approve</div>
          <div className="text-xs text-slate-600 mt-1">Payment proof reviewed</div>
        </button>

        <button
          onClick={() => setDecision('reject')}
          className={`p-4 rounded-xl border-2 transition-all ${
            decision === 'reject'
              ? 'border-red-500 bg-red-50'
              : 'border-slate-200 hover:border-red-300'
          }`}
        >
          <XCircle className={`w-8 h-8 mx-auto mb-2 ${
            decision === 'reject' ? 'text-red-500' : 'text-slate-400'
          }`} />
          <div className="text-sm font-semibold text-slate-900">Reject</div>
          <div className="text-xs text-slate-600 mt-1">Documents invalid</div>
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this verification..."
          rows={3}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {decision && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50 ${
            decision === 'approve'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {loading ? 'Processing...' : decision === 'approve' ? 'Approve Basic Registration' : 'Reject Application'}
        </button>
      )}
    </div>
  );
}
