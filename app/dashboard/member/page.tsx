import Link from 'next/link';
import { Search, MapPin, Calendar, Star, Shield, Bell, Settings, AlertCircle, Clock } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { createClient } from '@/lib/supabase/server';
import { formatMembershipExpiry, getMembershipExpiry } from '@/lib/membership';
import { redirect } from 'next/navigation';

async function getMemberData() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check whether this user should actually be on the driver or admin dashboard
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

  if (roleProfile?.role === 'platform_admin' || roleProfile?.role === 'group_admin') {
    redirect('/admin');
  }

  if (roleProfile?.role === 'driver' || driverProfile) {
    redirect('/dashboard/driver');
  }

  // Get member profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, role, membership_type, membership_status, membership_expires_at, zii_status')
    .eq('user_id', user.id)
    .single();

  // Get payment info
  const { data: payment } = await supabase
    .from('payments')
    .select('payment_reference, status, proof_url, proof_image, amount, plan_type, created_at, activated_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get upcoming trip requests (accepted)
  const { data: upcomingRequests } = await supabase
    .from('trip_requests')
    .select(`
      id,
      trip_id,
      status,
      trips (
        id,
        origin,
        destination,
        departure_date,
        departure_time,
        driver_id,
        driver_profiles (
          user_id,
          rating_average,
          profiles (
            first_name,
            surname
          )
        )
      )
    `)
    .eq('passenger_id', profile?.id)
    .eq('status', 'accepted')
    .gte('trips.departure_date', new Date().toISOString().split('T')[0])
    .order('trips.departure_date', { ascending: true })
    .limit(5);

  // Get saved routes
  const { data: savedRoutes } = await supabase
    .from('saved_routes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get trusted drivers
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
    payment,
    upcomingRequests: upcomingRequests || [],
    savedRoutes: savedRoutes || [],
    trustedDrivers: trustedDrivers || [],
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export default async function MemberDashboard() {
  const data = await getMemberData();

  const membershipLabel = data.profile?.membership_type === 'plus' ? 'Member Plus' : 'Member Basic';
  const membershipActive = data.profile?.membership_status === 'active' || data.payment?.status === 'approved';
  const paymentProof = data.payment?.proof_url || data.payment?.proof_image;
  const membershipExpiry = getMembershipExpiry(data.profile, data.payment);
  
  // Check payment status
  const needsPaymentProof = !membershipActive && !!data.payment && !paymentProof;
  const awaitingVerification = !membershipActive && !!paymentProof && data.payment.status === 'pending';
  const isVerified = membershipActive || data.payment?.status === 'approved';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Dashboard</h1>
              <p className="text-xs text-slate-600">
                Welcome back, {data.profile?.first_name || 'Member'}
              </p>
            </div>
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

          {/* Membership Status */}
          <div className={`rounded-lg p-3 text-white ${membershipActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-slate-400 to-slate-500'}`}>
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
                <div className="text-xs opacity-75">Bluetooth Verify</div>
                <div className="text-sm font-bold">
                  {data.profile?.zii_status === 'active' ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Payment Proof Required Banner */}
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
                  <div className="text-lg font-bold text-slate-900 font-mono">{data.payment.payment_reference}</div>
                </div>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Amount</div>
                  <div className="text-lg font-bold text-slate-900">R{data.payment.amount}</div>
                </div>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Banking Details</div>
                  <div className="text-sm font-semibold text-slate-900">Tyme Bank</div>
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

        {/* Awaiting Verification Banner */}
        {awaitingVerification && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-blue-900 mb-1">Verification In Progress</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Your payment proof has been submitted and is being reviewed by our admin team.
                </p>
                <p className="text-xs text-blue-700">
                  You'll be notified once your account is verified. This usually takes 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search - Only show if verified */}
        {isVerified && (
          <Link
            href="/trips"
            className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold mb-4 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Find a Lift
          </Link>
        )}

        {/* Disabled State for Unverified Users */}
        {!isVerified && (
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6 text-center mb-4">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Account Not Active</h3>
            <p className="text-sm text-slate-600">
              Complete payment verification to start finding and booking trips.
            </p>
          </div>
        )}

        {/* Upcoming Trips - Only show if verified */}
        {isVerified && (
          <>
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Trips</h2>
          {data.upcomingRequests.length > 0 ? (
            <div className="space-y-3">
              {data.upcomingRequests.map((request: any) => {
                const trip = request.trips;
                const driverProfile = trip?.driver_profiles?.profiles;
                
                return (
                  <div key={request.id} className="bg-white border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-sm font-semibold text-slate-900">
                            {trip.origin} → {trip.destination}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(trip.departure_date)} • {trip.departure_time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-semibold">
                        Confirmed
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-semibold text-slate-900">
                            {driverProfile?.first_name} {driverProfile?.surname?.charAt(0)}.
                          </span>
                          <Shield className="w-3 h-3 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span>{trip.driver_profiles?.rating_average?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                      <Link
                        href={`/trips/${trip.id}`}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">No upcoming trips</p>
              <p className="text-xs text-slate-400 mt-1">Find a lift to get started</p>
            </div>
          )}
        </div>

        {/* Saved Routes */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Saved Routes</h2>
            <Link href="/routes/add" className="text-xs text-emerald-600 font-semibold">
              + Add Route
            </Link>
          </div>
          {data.savedRoutes.length > 0 ? (
            <div className="space-y-2">
              {data.savedRoutes.map((route: any) => (
                <div key={route.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${route.alert_enabled ? 'bg-emerald-100' : 'bg-slate-100'} p-2 rounded-lg`}>
                      <MapPin className={`w-4 h-4 ${route.alert_enabled ? 'text-emerald-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {route.origin} → {route.destination}
                      </div>
                      <div className="text-xs text-slate-500">
                        Alerts {route.alert_enabled ? 'on' : 'off'}
                      </div>
                    </div>
                  </div>
                  {route.alert_enabled && <Bell className="w-4 h-4 text-emerald-500" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">No saved routes</p>
              <p className="text-xs text-slate-400 mt-1">Save routes to get alerts for new trips</p>
            </div>
          )}
        </div>

        {/* Trusted Drivers */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Trusted Drivers</h2>
            {data.trustedDrivers.length > 0 && (
              <Link href="/drivers/trusted" className="text-xs text-emerald-600 font-semibold">
                View All
              </Link>
            )}
          </div>
          {data.trustedDrivers.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {data.trustedDrivers.slice(0, 6).map((trusted: any, index: number) => {
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
                  <div key={trusted.id} className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
                    <div className={`w-12 h-12 bg-gradient-to-br ${colors[index % colors.length]} rounded-full mx-auto mb-1.5`} />
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
              <p className="text-xs text-slate-400 mt-1">Add drivers you trust for quick booking</p>
            </div>
          )}
        </div>

        {/* Safety Tip */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-amber-900 mb-1">Safety Tip</div>
              <p className="text-xs text-amber-800">
                Always use Match Check to confirm the driver's face, vehicle and licence plate before getting in.
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
