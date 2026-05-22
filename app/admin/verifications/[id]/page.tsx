import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ApproveRejectButtons from './ApproveRejectButtons';

async function getVerificationData(id: string) {
  noStore();

  const supabase = await createClient();

  const { data: driverProfile, error } = await supabase
    .from('driver_profiles')
    .select('id, user_id, provider_plan')
    .eq('id', id)
    .single();

  if (error || !driverProfile) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, phone, email')
    .eq('user_id', driverProfile.user_id)
    .maybeSingle();

  return {
    driverProfile,
    profile,
  };
}

export default async function VerificationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getVerificationData(id);

  if (!data) {
    notFound();
  }

  const { driverProfile, profile } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <Link href="/admin/verifications" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to verifications
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Driver Verification Review</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Basic Registration</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-500 mb-0.5">Plan</div>
              <div className="font-semibold text-slate-900">{driverProfile.provider_plan || 'provider_annual'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-500 mb-0.5">First Name</div>
              <div className="font-semibold text-slate-900">{profile?.first_name || 'Unavailable'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-500 mb-0.5">Surname</div>
              <div className="font-semibold text-slate-900">{profile?.surname || 'Unavailable'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-500 mb-0.5">Phone</div>
              <div className="font-semibold text-slate-900">{profile?.phone || 'Unavailable'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-500 mb-0.5">Email</div>
              <div className="font-semibold text-slate-900">{profile?.email || 'Unavailable'}</div>
            </div>
          </div>
        </div>

        <ApproveRejectButtons driverProfileId={driverProfile.id} />
      </div>
    </div>
  );
}
