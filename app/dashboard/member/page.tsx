import Link from 'next/link';
import { Search, MapPin, Star, Shield, Bell, Settings, AlertCircle, Clock } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import ProfileAvatar from '@/components/ProfileAvatar';
import { getDisplayName } from '@/lib/display-name';
import { createClient } from '@/lib/supabase/server';
import { formatMembershipExpiry, getMembershipExpiry, getPlanLabel } from '@/lib/membership';
import { redirect } from 'next/navigation';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SavedRoute = {
  id: string;
  origin: string | null;
  destination: string | null;
  alert_enabled: boolean | null;
};

type TrustedDriver = {
  id: string;
  driver_profiles?: {
    rating_average?: number | null;
    profiles?: {
      first_name?: string | null;
      surname?: string | null;
    } | null;
  } | null;
};

async function getMemberData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: roleProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (isAdminRole(roleProfile?.role) || isSuperAdminEmail(user.email)) {
    redirect('/admin');
  }

  if (roleProfile?.role === 'driver' || driverProfile) {
    redirect('/dashboard/driver');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, surname, profile_photo_url, role, membership_type, membership_status, membership_expires_at')
    .eq('user_id', user.id)
    .single();

  const { data: payment } = await supabase
    .from('payments')
    .select('payment_reference, status, proof_url, proof_image, amount, plan_type, created_at, activated_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: savedRoutes } = await supabase
    .from('saved_routes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: trustedDrivers } = await supabase
    .from('trusted_drivers')
    .select(`
      id,
      driver_profiles (
        id,
        rating_average,
        user_id,
        profiles (
          first_name,
          surname
        )
      )
    `)
    .eq('passenger_id', profile?.id)
    .limit(6);

  return {
    profile,
    userEmail: user.email ?? null,
    payment,
    savedRoutes: (savedRoutes || []) as SavedRoute[],
    trustedDrivers: (trustedDrivers || []) as TrustedDriver[],
  };
}

export default async function MemberDashboard() {
  const data = await getMemberData();
  const memberDisplayName = getDisplayName({
    firstName: data.profile?.first_name,
    surname: data.profile?.surname,
    email: data.userEmail,
    fallback: 'Member',
  });

  const membershipLabel = getPlanLabel(data.profile?.membership_type);
  const membershipActive = data.profile?.membership_status === 'active' || data.payment?.status === 'approved';
  const paymentProof = data.payment?.proof_url || data.payment?.proof_image;
  const membershipExpiry = getMembershipExpiry(data.profile, data.payment);

  const needsPaymentProof = !membershipActive && !!data.payment && !paymentProof;
  const awaitingVerification = !membershipActive && !!paymentProof && data.payment?.status === 'pending';
  const isVerified = membershipActive || data.payment?.status === 'approved';
  const savedRoutes = data.savedRoutes ?? [];
  const trustedDrivers = data.trustedDrivers ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Dashboard</h1>
              <p className="text-xs text-slate-600">
                Welcome back, {memberDisplayName}
              </p>
            </div>
            <ProfileAvatar
              name={memberDisplayName}
              photoUrl={data.profile?.profile_photo_url || null}
              size={48}
              className="shrink-0 border border-slate-200 shadow-sm"
            />
            <div className="flex items-center gap-2">
              <Link href="/notifications" className="p-2 hover:bg-slate-100 rounded-lg relative">
                <Bell className="w-5 h-5 text-slate-600" />
              </Link>
              <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings className="w-5 h-5 text-slate-600" />
              </Link>
              <LogoutButton />
            </div>
          </div>

          <div
            className={`rounded-lg p-3 text-white ${membershipActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-slate-400 to-slate-500'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold">{membershipLabel}</span>
                </div>
                <p className="text-xs opacity-90">
                  {membershipActive
                    ? `Active until ${formatMembershipExpiry(membershipExpiry)}`
                    : 'Membership pending'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-75">Account</div>
                <div className="text-sm font-bold">
                  {data.profile?.membership_status === 'active' ? 'Active' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-emerald-600">{savedRoutes.length}</div>
              <div className="text-[10px] text-slate-600">Saved</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-blue-600">{trustedDrivers.length}</div>
              <div className="text-[10px] text-slate-600">Trusted</div>
            </div>
            <div className={`${isVerified ? 'bg-purple-50' : 'bg-slate-100'} rounded-lg p-2.5 text-center`}>
              <div className={`text-lg font-bold ${isVerified ? 'text-purple-600' : 'text-slate-500'}`}>
                {isVerified ? 'On' : 'Off'}
              </div>
              <div className="text-[10px] text-slate-600">Status</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {needsPaymentProof && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-amber-900 mb-1">Payment Proof Required</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Please upload your proof of payment to activate your account.
                </p>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Payment Reference</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{data.payment?.payment_reference}</div>
                </div>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Amount</div>
                  <div className="text-lg font-bold text-slate-900">R{data.payment?.amount}</div>
                </div>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Banking Details</div>
                  <div className="text-sm font-semibold text-slate-900">LiftCheck Safety</div>
                  <div className="text-sm text-slate-700">Tyme Bank</div>
                  <div className="text-sm text-slate-700">Account: 51129386380</div>
                </div>
                <Link
                  href="/payment/upload"
                  className="block w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg text-sm font-bold text-center"
                >
                  Upload Payment Proof
                </Link>
              </div>
            </div>
          </div>
        )}

        {awaitingVerification && (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900 mb-1">Verification In Progress</h3>
                <p className="text-xs text-blue-800 mb-1.5">
                  Your payment proof has been submitted and is being reviewed by our admin team.
                </p>
                <p className="text-[11px] text-blue-700">
                  You&apos;ll be notified once your account is verified. This usually takes 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {isVerified && (
          <Link
            href="/routes"
            className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold mb-4 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Find a Route
          </Link>
        )}

        {!isVerified && (
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6 text-center mb-4">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Account Not Active</h3>
            <p className="text-sm text-slate-600">
              Complete payment verification to start finding routes.
            </p>
          </div>
        )}

        {isVerified && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Saved Routes</h2>
                <Link href="/routes/add" className="text-xs text-emerald-600 font-semibold">
                  + Add Route
                </Link>
              </div>
              {savedRoutes.length > 0 ? (
                <div className="space-y-2">
                  {savedRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`${route.alert_enabled ? 'bg-emerald-100' : 'bg-slate-100'} p-2 rounded-lg`}>
                          <MapPin
                            className={`w-4 h-4 ${route.alert_enabled ? 'text-emerald-600' : 'text-slate-600'}`}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {route.origin} &rarr; {route.destination}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Alerts {route.alert_enabled ? 'on' : 'off'}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {route.alert_enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <Bell className="w-3 h-3" />
                            Alert on
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            Alert off
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">No saved routes</p>
                  <p className="text-xs text-slate-400 mt-1">Save routes to get alerts when matching routes open</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Trusted Drivers</h2>
                {trustedDrivers.length > 0 && (
                  <Link href="/drivers/trusted" className="text-xs text-emerald-600 font-semibold">
                    View All
                  </Link>
                )}
              </div>
              {trustedDrivers.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {trustedDrivers.slice(0, 6).map((trusted, index: number) => {
                    const driver = trusted.driver_profiles?.profiles;
                    const colors = [
                      'from-emerald-400 to-emerald-600',
                      'from-blue-400 to-blue-600',
                      'from-purple-400 to-purple-600',
                      'from-pink-400 to-pink-600',
                      'from-orange-400 to-orange-600',
                      'from-teal-400 to-teal-600',
                    ];

                    return (
                      <div key={trusted.id} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <div
                          className={`w-12 h-12 bg-gradient-to-br ${colors[index % colors.length]} rounded-full mx-auto mb-1.5`}
                        />
                        <div className="text-xs font-semibold text-slate-900 mb-0.5">
                          {driver?.first_name} {driver?.surname?.charAt(0)}.
                        </div>
                        <div className="flex items-center justify-center gap-0.5 text-xs text-slate-600">
                          <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                          <span>{trusted.driver_profiles?.rating_average?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">No trusted drivers yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add drivers you trust for faster route matching</p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-amber-900 mb-1">Safety Tip</div>
                  <p className="text-xs text-amber-800">
                    Always use Match Check to confirm the driver&apos;s face, vehicle and licence plate before getting in.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}