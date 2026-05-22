import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Camera, ChevronRight, CreditCard, HelpCircle, Lock, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';
import NotificationPreferences from './notification-preferences';
import { getSettingsBackHref } from './_lib';
import { formatMembershipExpiry, getMembershipExpiry, getPlanLabel } from '@/lib/membership';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, phone, role, profile_photo_url, membership_type, membership_status, membership_expires_at, zii_status, home_province')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('verification_status, provider_plan, completed_trips, rating_average, rating_count, is_suspended')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: latestPayment } = await supabase
    .from('payments')
    .select('plan_type, status, created_at, activated_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const role = profile?.role ?? null;
  const isDriver = role === 'driver' || !!driverProfile;
  const backHref = getSettingsBackHref(role, !!driverProfile);
  const displayName = `${profile?.first_name ?? user.email?.split('@')[0] ?? 'User'} ${profile?.surname ?? ''}`.trim();
  const membershipExpiry = getMembershipExpiry(profile, latestPayment);

  const statusLabel =
    role === 'driver'
      ? `${getPlanLabel(driverProfile?.provider_plan)} • ${driverProfile?.verification_status === 'approved' ? 'Active' : 'Pending'}`
      : role === 'group_admin'
        ? 'Group Admin • Active'
        : `${getPlanLabel(profile?.membership_type)} • ${profile?.membership_status === 'active' ? 'Active' : 'Pending'}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href={backHref} className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              {profile?.profile_photo_url ? (
                <div
                  className="w-16 h-16 rounded-full bg-center bg-cover"
                  style={{ backgroundImage: `url(${profile.profile_photo_url})` }}
                  aria-label={displayName}
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                  {displayName
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              <button className="absolute bottom-0 right-0 bg-white border-2 border-slate-200 rounded-full p-1 hover:bg-slate-50">
                <Camera className="w-3 h-3 text-slate-600" />
              </button>
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-slate-900 mb-1">{displayName}</div>
              <div className="text-xs text-slate-600">{statusLabel}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-600">Phone</span>
              <span className="text-sm font-semibold text-slate-900">{profile?.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-600">Email</span>
              <span className="text-sm font-semibold text-slate-900">{user.email || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-600">Province</span>
              <span className="text-sm font-semibold text-slate-900">
                {profile?.home_province || 'Not set'}
              </span>
            </div>
          </div>

          <Link
            href="/settings/profile"
            className="block mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold text-center"
          >
            Edit Profile
          </Link>
        </div>

        {isDriver && driverProfile && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Driver Status</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-600">Verification</span>
                <span className="text-sm font-semibold text-slate-900">
                  {driverProfile.verification_status}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-600">Provider Plan</span>
                <span className="text-sm font-semibold text-slate-900">
                  {driverProfile.provider_plan || 'annual'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-600">Trips Completed</span>
                <span className="text-sm font-semibold text-slate-900">
                  {driverProfile.completed_trips ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-600">Rating</span>
                <span className="text-sm font-semibold text-slate-900">
                  {driverProfile.rating_average?.toFixed(1) || '0.0'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Account</h2>
          <div className="space-y-2">
            <Link
              href="/settings/password"
              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-900">Change Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/settings/membership"
              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-sm text-slate-900">Membership</div>
                  <div className="text-xs text-emerald-600">
                    {getPlanLabel(profile?.membership_type)}
                    {membershipExpiry ? ` • Expires ${formatMembershipExpiry(membershipExpiry)}` : ''}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/settings/zii"
              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-sm text-slate-900">Zii Verify</div>
                  <div className="text-xs text-emerald-600">{profile?.zii_status || 'inactive'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Notifications</h2>
          <NotificationPreferences storageKey={user.id} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Support</h2>
          <div className="space-y-2">
            <Link
              href="/help"
              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-900">Help Center</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/privacy"
              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-900">Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/terms"
              className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-900">Terms of Service</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        <LogoutButton />

        <div className="mt-4 text-center text-xs text-slate-500">
          Version 1.0.0 • LiftCheck © 2026
        </div>
      </div>
    </div>
  );
}
