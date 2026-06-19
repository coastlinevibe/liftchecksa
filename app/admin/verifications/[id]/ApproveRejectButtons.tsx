'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  driverProfileId: string;
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'An error occurred';
}

export default function ApproveRejectButtons({ driverProfileId }: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!decision) return;
    
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      if (decision === 'approve') {
        const { data: currentDriverProfile, error: profileError } = await supabase
          .from('driver_profiles')
          .select('vehicle_status')
          .eq('id', driverProfileId)
          .maybeSingle();

        if (profileError) throw profileError;

        const { error: driverError } = await supabase
          .from('driver_profiles')
          .update({ 
            id_status: 'approved',
            verification_status: currentDriverProfile?.vehicle_status === 'approved' ? 'approved' : 'pending'
          })
          .eq('id', driverProfileId);

        if (driverError) throw driverError;

        alert('Driver registration reviewed successfully!');
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

        alert('Application rejected');
        router.push('/admin');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="text-base font-bold text-slate-900 mb-3">Driver Registration Review</h2>
      
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
          <div className="text-xs text-slate-600 mt-1">Driver details and ID look correct</div>
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
          {loading ? 'Processing...' : decision === 'approve' ? 'Approve Registration' : 'Reject Application'}
        </button>
      )}
    </div>
  );
}
