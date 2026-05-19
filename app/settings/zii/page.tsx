import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Bluetooth, ShieldAlert, ShieldCheck } from 'lucide-react';
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
    .select('role, zii_status, membership_type')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('verification_status, id_status, licence_status, vehicle_status')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: token } = await supabase
    .from('zii_tokens')
    .select('token_status, issued_at, expires_at, last_synced_at')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const backHref = getSettingsBackHref(profile?.role, !!driverProfile);
  const isActive = profile?.zii_status === 'active' || token?.token_status === 'active';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href={backHref} className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Zii Verify</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        <div className={`rounded-xl border p-4 ${isActive ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`rounded-full p-3 ${isActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              {isActive ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-slate-600" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">Bluetooth Verification</div>
              <div className="text-xs text-slate-600">
                {isActive ? 'Ready for offline check-ins' : 'Not yet active'}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between rounded-lg bg-white p-3">
              <span className="text-xs text-slate-600">App Status</span>
              <span className="text-sm font-semibold text-slate-900">{profile?.zii_status || 'inactive'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white p-3">
              <span className="text-xs text-slate-600">Token Status</span>
              <span className="text-sm font-semibold text-slate-900">{token?.token_status || 'none'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white p-3">
              <span className="text-xs text-slate-600">Last Synced</span>
              <span className="text-sm font-semibold text-slate-900">
                {token?.last_synced_at ? new Date(token.last_synced_at).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {driverProfile && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bluetooth className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Driver Verification Status</h2>
            </div>

            <div className="space-y-2">
              <StatusRow label="Overall" value={driverProfile.verification_status} />
              <StatusRow label="ID" value={driverProfile.id_status} />
              <StatusRow label="Licence" value={driverProfile.licence_status} />
              <StatusRow label="Vehicle" value={driverProfile.vehicle_status} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-2">How it works</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <p>1. Meet the driver at pickup.</p>
            <p>2. Open Zii Verify on both phones.</p>
            <p>3. Exchange the offline token over Bluetooth.</p>
            <p>4. Sync the result later when data is available.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value || 'not set'}</span>
    </div>
  );
}
