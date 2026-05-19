import Link from 'next/link';
import { Plus, Calendar, Users, MapPin, Clock, Settings } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

async function getDriverData() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check whether this user should actually be on the member or admin dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, role, membership_status')
    .eq('user_id', user.id)
    .single();

  // Get driver stats and ID
  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, completed_trips, rating_average, verification_status')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    redirect('/login');
  }

  if (profile?.role === 'platform_admin' || profile?.role === 'group_admin') {
    redirect('/admin');
  }

  if (profile?.role !== 'driver' && !driverProfile) {
    redirect('/dashboard/member');
  }

  // Get payment info
  const { data: payment } = await supabase
    .from('payments')
    .select('payment_reference, status, proof_url, proof_image, plan_type, created_at, activated_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, colour, licence_plate, verification_status, is_active')
    .eq('driver_id', driverProfile.id)
    .order('created_at', { ascending: false });

  // Get active trips (published or full status) - use driver_profiles.id
  const { data: activeTrips } = await supabase
    .from('trips')
    .select(`
      id,
      origin,
      destination,
      departure_date,
      departure_time,
      seats_total,
      seats_available,
      cost_share_amount,
      status
    `)
    .eq('driver_id', driverProfile.id)
    .in('status', ['published', 'full'])
    .order('departure_date', { ascending: true })
    .limit(5);

  // Get completed trips - use driver_profiles.id
  const { data: completedTrips } = await supabase
    .from('trips')
    .select(`
      id,
      origin,
      destination,
      departure_date,
      seats_total,
      seats_available,
      cost_share_amount
    `)
    .eq('driver_id', driverProfile.id)
    .eq('status', 'completed')
    .order('departure_date', { ascending: false })
    .limit(5);

  // Calculate total earnings (completed trips)
  const totalEarnings = completedTrips?.reduce((sum, trip) => {
    const seatsBooked = trip.seats_total - trip.seats_available;
    return sum + (seatsBooked * trip.cost_share_amount);
  }, 0) || 0;

  return {
    profile,
    driverProfile,
    payment,
    activeTrips: activeTrips || [],
    completedTrips: completedTrips || [],
    vehicles: vehicles || [],
    totalEarnings,
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export default async function DriverDashboard() {
  const data = await getDriverData();
  
  // Check if payment proof is needed
  const paymentProof = data.payment?.proof_url || data.payment?.proof_image;
  const membershipActive = data.profile?.membership_status === 'active' || data.payment?.status === 'approved';
  const needsPaymentProof = !membershipActive && !!data.payment && !paymentProof;
  const awaitingVerification = !membershipActive && !!paymentProof && data.payment?.status === 'pending';
  const isVerified =
    data.driverProfile?.verification_status === 'approved' &&
    (membershipActive || data.payment?.status === 'approved');
  const approvedVehicles = data.vehicles.filter((vehicle: any) => vehicle.is_active !== false && vehicle.verification_status === 'approved');
  const canCreateTrips = isVerified && approvedVehicles.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Driver Dashboard</h1>
              <p className="text-xs text-slate-600">
                Welcome back, {data.profile?.first_name || 'Driver'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings className="w-5 h-5 text-slate-600" />
              </Link>
              <LogoutButton />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-emerald-600">
                {data.driverProfile?.completed_trips || 0}
              </div>
              <div className="text-[10px] text-slate-600">Trips</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-blue-600">
                {data.driverProfile?.rating_average?.toFixed(1) || '0.0'}
              </div>
              <div className="text-[10px] text-slate-600">Rating</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-purple-600">
                R{data.totalEarnings.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600">Earned</div>
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
                  <div className="text-lg font-bold text-slate-900 font-mono">{data.payment?.payment_reference}</div>
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

        {/* Verified - Show Full Dashboard */}
        {isVerified ? (
          <>
            {/* Vehicle gate */}
            {!canCreateTrips ? (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-amber-900 mb-1">
                      {data.vehicles.length === 0 ? 'Add a vehicle first' : 'Vehicle under review'}
                    </h3>
                    <p className="text-sm text-amber-800 mb-3">
                      {data.vehicles.length === 0
                        ? 'You need to register a vehicle before you can create a trip.'
                        : 'Your vehicle needs admin approval before trip creation is unlocked.'}
                    </p>
                    <Link
                      href="/dashboard/driver/vehicles"
                      className="inline-flex items-center justify-center w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg text-sm font-semibold"
                    >
                      {data.vehicles.length === 0 ? 'Register Vehicle' : 'View Vehicle Status'}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/dashboard/driver/create-trip"
                className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold mb-4 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Trip
              </Link>
            )}

        {/* Active Trips */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Active Trips</h2>
          {data.activeTrips.length > 0 ? (
            <div className="space-y-3">
              {data.activeTrips.map((trip: any) => {
                const seatsBooked = trip.seats_total - trip.seats_available;
                const isFull = trip.seats_available === 0;
                
                return (
                  <div key={trip.id} className="bg-white border border-slate-200 rounded-xl p-3">
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
                            <span>{formatDate(trip.departure_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{trip.departure_time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-emerald-600">
                          R{trip.cost_share_amount}
                        </div>
                        <div className="text-[10px] text-slate-500">per seat</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Users className="w-3.5 h-3.5" />
                        <span>{seatsBooked} of {trip.seats_total} seats booked</span>
                      </div>
                      {isFull ? (
                        <div className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                          Full
                        </div>
                      ) : (
                        <Link
                          href={`/trips/${trip.id}`}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">No active trips</p>
              <p className="text-xs text-slate-400 mt-1">Create your first trip to get started</p>
            </div>
          )}
        </div>

        {/* Completed Trips */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Completed Trips</h2>
          {data.completedTrips.length > 0 ? (
            <div className="space-y-2">
              {data.completedTrips.map((trip: any) => {
                const seatsBooked = trip.seats_total - trip.seats_available;
                const earnings = seatsBooked * trip.cost_share_amount;
                
                return (
                  <div key={trip.id} className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 mb-1">
                          {trip.origin} → {trip.destination}
                        </div>
                        <div className="text-xs text-slate-600">
                          {formatDate(trip.departure_date)} • {seatsBooked} passenger{seatsBooked !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">R{earnings}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">No completed trips yet</p>
            </div>
          )}
        </div>

        {/* Disabled State for Unverified Users */}
        {!isVerified && (
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Account Not Active</h3>
            <p className="text-sm text-slate-600">
              Complete payment verification to start creating trips and earning.
            </p>
          </div>
        )}
          </>
        ) : (
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Account Not Active</h3>
            <p className="text-sm text-slate-600">
              Complete payment verification to start creating trips and earning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
