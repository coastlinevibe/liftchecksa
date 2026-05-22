import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Camera, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSettingsBackHref } from '../_lib';
import ProfileEditor from './ProfileEditor';
import { getPlanLabel } from '@/lib/membership';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, phone, role, profile_photo_url, membership_type, membership_status, home_province')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('verification_status, provider_plan')
    .eq('user_id', user.id)
    .maybeSingle();

  const roleLabel =
    profile?.role === 'driver'
      ? `${getPlanLabel(driverProfile?.provider_plan)}`
      : profile?.role === 'group_admin'
        ? 'Group Admin'
        : getPlanLabel(profile?.membership_type);

  const backHref = getSettingsBackHref(profile?.role, !!driverProfile);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href={backHref} className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Edit Profile</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {profile?.profile_photo_url ? (
                <div
                  className="w-16 h-16 rounded-full bg-center bg-cover"
                  style={{ backgroundImage: `url(${profile.profile_photo_url})` }}
                  aria-label="Profile photo"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                  {profile?.first_name?.[0] ?? user.email?.[0] ?? 'U'}
                </div>
              )}
              <div className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-white p-1">
                <Camera className="w-3 h-3 text-slate-600" />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">Profile photo</div>
              <div className="text-xs text-slate-600">Managed from your account records</div>
            </div>
          </div>

          {profile?.role === 'driver' && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Driver documents are reviewed from the driver dashboard.
            </div>
          )}
        </div>

        <ProfileEditor
          firstName={profile?.first_name ?? ''}
          surname={profile?.surname ?? ''}
          phone={profile?.phone ?? ''}
          homeProvince={profile?.home_province ?? ''}
          roleLabel={roleLabel}
          email={user.email ?? ''}
        />
      </div>
    </div>
  );
}
