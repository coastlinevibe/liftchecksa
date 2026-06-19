'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  vehicleId: string;
  driverProfileId: string;
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'An error occurred';
}

export default function VehicleApproveButtons({ vehicleId, driverProfileId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // Update vehicle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ verification_status: 'approved' })
        .eq('id', vehicleId);

      if (vehicleError) throw vehicleError;
      // Update driver profile
      const { error: driverError } = await supabase
        .from('driver_profiles')
        .update({ 
          vehicle_status: 'approved'
        })
        .eq('id', driverProfileId);

      if (driverError) throw driverError;

      alert('Vehicle reviewed successfully!');
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Reject this vehicle?')) return;

    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('vehicles')
        .update({ verification_status: 'rejected' })
        .eq('id', vehicleId);

      if (error) throw error;

      const { error: driverError } = await supabase
        .from('driver_profiles')
        .update({
          vehicle_status: 'rejected',
        })
        .eq('id', driverProfileId);

      if (driverError) throw driverError;

      alert('Vehicle review rejected');
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {loading ? 'Processing...' : 'Approve Registration'}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject Registration
        </button>
      </div>
    </div>
  );
}
