import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSettingsBackHref } from '../_lib';

export default async function ZiiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const backHref = getSettingsBackHref(profile?.role, !!driverProfile);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href={backHref} className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Bluetooth Verification</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-slate-100 p-3 text-slate-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">Feature paused</div>
              <p className="mt-1 text-xs text-slate-600">
                Zii / Bluetooth verification is not part of the current MVP release. The team will re-enable this flow when it is ready.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          Use your profile, membership, and driver verification settings instead.
        </div>
      </div>
    </div>
  );
}
