'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, CreditCard, Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type TripBookingPaymentStepProps = {
  bookingId: string;
  tripId: string;
  currentPaymentMethod?: string | null;
  currentPaymentStatus?: string | null;
  currentPaymentProofUrl?: string | null;
};

export default function TripBookingPaymentStep({
  bookingId,
  tripId,
  currentPaymentMethod,
  currentPaymentStatus,
  currentPaymentProofUrl,
}: TripBookingPaymentStepProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [selectedMethod, setSelectedMethod] = useState<'pop' | 'coa' | null>(
    currentPaymentMethod === 'pop' || currentPaymentMethod === 'coa' ? currentPaymentMethod : null
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const paymentReady =
    currentPaymentMethod === 'coa' ||
    (currentPaymentMethod === 'pop' &&
      (currentPaymentStatus === 'submitted' || currentPaymentStatus === 'confirmed') &&
      Boolean(currentPaymentProofUrl));

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be smaller than 5MB.');
      return;
    }

    setError('');
    setProofFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const saveCashOnArrival = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('trip_requests')
      .update({
        payment_method: 'coa',
        payment_status: 'cash_on_arrival',
        payment_proof_url: null,
        payment_submitted_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSelectedMethod('coa');
    setSuccess('Cash on arrival selected.');
    router.refresh();
  };

  const uploadPop = async () => {
    if (!proofFile) {
      setError('Choose a proof file first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      setError('You must be logged in.');
      return;
    }

    const ext = proofFile.name.split('.').pop() || 'png';
    const safeExt = ext.toLowerCase();
    const suffix =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filePath = `${auth.user.id}/trip-${tripId}-${bookingId}-${suffix}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, proofFile, {
        contentType: proofFile.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      setLoading(false);
      setError(uploadError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('trip_requests')
      .update({
        payment_method: 'pop',
        payment_status: 'submitted',
        payment_proof_url: filePath,
        payment_submitted_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSelectedMethod('pop');
    setSuccess('Proof of payment submitted.');
    router.refresh();
  };

  if (paymentReady) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Payment confirmed</h2>
        </div>
        <p className="text-sm text-slate-700">
          Payment method: <span className="font-semibold">{currentPaymentMethod === 'coa' ? 'Cash on Arrival' : 'Proof of Payment'}</span>
        </p>
        <p className="text-xs text-slate-500">
          Match Check is now unlocked.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Choose payment method</h2>
        <p className="text-xs text-slate-600 mt-1">Pick one before opening Match Check.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedMethod('pop');
            setSuccess('');
            setError('');
          }}
          className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold ${
            selectedMethod === 'pop'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 bg-white text-slate-900'
          }`}
        >
          <Upload className="h-4 w-4 mb-2" />
          Upload POP
          <div className="mt-1 text-xs font-normal text-slate-500">Send proof to the driver</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMethod('coa');
            setSuccess('');
            setError('');
          }}
          className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold ${
            selectedMethod === 'coa'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 bg-white text-slate-900'
          }`}
        >
          <CreditCard className="h-4 w-4 mb-2" />
          Cash on Arrival
          <div className="mt-1 text-xs font-normal text-slate-500">Pay when the driver arrives</div>
        </button>
      </div>

      {selectedMethod === 'pop' ? (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-900">Upload proof of payment</span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm"
            />
          </label>

          {preview ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
              File selected and ready to upload.
            </div>
          ) : null}

          <button
            type="button"
            onClick={uploadPop}
            disabled={loading || !proofFile}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Submit POP
          </button>
        </div>
      ) : null}

      {selectedMethod === 'coa' ? (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={saveCashOnArrival}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Confirm COA
          </button>
        </div>
      ) : null}

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{success}</div> : null}
    </div>
  );
}
