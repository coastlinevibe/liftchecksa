import Link from 'next/link';
import { Bell, Calendar, Clock, MapPin, Settings, BadgeCheck } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { getDisplayName } from '@/lib/display-name';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';
import { formatPassengerSeats } from '@/lib/types/pilot-routes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DriverVehicleSummary = {
  is_active?: boolean | null;
  verification_status?: string | null;
};

type DriverRouteSummary = {
  id: string;
  route_id: string;
  status: string;
  seats_available: number;
  days_active: string[];
  weekly_price?: number | string | null;
  single_route_price?: number | string | null;
  passenger_request_count?: number;
  official_route?: {
    id: string;
    name?: string | null;
    start_area?: string | null;
    end_area?: string | null;
    status?: string | null;
  } | null;
};

type DriverAssignmentRow = {
  id: string;
  driver_id: string;
  vehicle_id: string;
  route_id: string;
  status: string;
  seats_available: number;
  days_active: string[];
  weekly_price?: number | string | null;
  single_route_price?: number | string | null;
  created_at: string;
  official_routes:
    | {
        id: string;
        name?: string | null;
        start_area?: string | null;
        end_area?: string | null;
        status?: string | null;
      }
    | {
        id: string;
        name?: string | null;
        start_area?: string | null;
        end_area?: string | null;
        status?: string | null;
      }[]
    | null;
};

async function getDriverData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, surname, role, membership_status')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile, error: driverProfileError } = await supabase
    .from('driver_profiles')
    .select('id, rating_average, verification_status, id_status, vehicle_status, id_document_url, provider_plan, provider_payment_reference, provider_payment_amount, provider_payment_status, provider_payment_proof_url, provider_last_paid_at, provider_next_payment_at, provider_expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (driverProfileError || !driverProfile) {
    redirect('/login');
  }

  if (isAdminRole(profile?.role) || isSuperAdminEmail(user.email)) {
    redirect('/admin');
  }

  if (profile?.role !== 'driver' && !driverProfile) {
    redirect('/dashboard/member');
  }

  const { data: driverAssignments } = await supabase
    .from('driver_route_assignments')
    .select('id, driver_id, vehicle_id, route_id, status, seats_available, days_active, weekly_price, single_route_price, created_at, official_routes(id, name, start_area, end_area, status)')
    .eq('driver_id', driverProfile.id)
    .order('created_at', { ascending: false });

  const routeAssignments = (driverAssignments || []).map((assignment) => {
    const typedAssignment = assignment as DriverAssignmentRow;
    return {
      ...typedAssignment,
      official_route: Array.isArray(typedAssignment.official_routes)
        ? typedAssignment.official_routes[0] || null
        : typedAssignment.official_routes || null,
    } as DriverRouteSummary;
  });

  const assignmentIds = routeAssignments.map((assignment) => assignment.id);
  const { data: routeRequestsData } = assignmentIds.length
    ? await supabase
        .from('route_seat_requests')
        .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, seats_requested, requested_days, request_type, preferred_morning_time, preferred_return_time, status, matched_assignment_id, admin_notes, created_at, updated_at')
        .in('matched_assignment_id', assignmentIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const { data: payment } = await supabase
    .from('payments')
    .select('payment_reference, amount, status, proof_url, proof_image, plan_type, created_at, activated_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, colour, licence_plate, verification_status, is_active')
    .eq('driver_id', driverProfile.id)
    .order('created_at', { ascending: false });

  return {
    profile,
    driverProfile,
    userEmail: user.email ?? null,
    payment,
    vehicles: vehicles || [],
    routeAssignments,
    routeRequests: routeRequestsData || [],
  };
}

export default async function DriverDashboard() {
  const data = await getDriverData();
  const driverDisplayName = getDisplayName({
    firstName: data.profile?.first_name,
    surname: data.profile?.surname,
    email: data.userEmail,
    fallback: 'Driver',
  });

  const paymentProof = data.driverProfile?.provider_payment_proof_url || data.payment?.proof_url || data.payment?.proof_image;
  const paymentStatus = data.driverProfile?.provider_payment_status || data.payment?.status || null;
  const paymentReference = data.driverProfile?.provider_payment_reference || data.payment?.payment_reference || null;
  const paymentAmount = data.driverProfile?.provider_payment_amount ?? data.payment?.amount ?? null;
  const paymentDueAt = data.driverProfile?.provider_next_payment_at || data.driverProfile?.provider_expires_at || data.payment?.expires_at || null;
  const paymentApproved = paymentStatus === 'approved' && (!paymentDueAt || new Date(paymentDueAt) > new Date());
  const idApproved = data.driverProfile?.id_status === 'approved';
  const vehicleApproved = data.driverProfile?.vehicle_status === 'approved';
  const registeredVehicles = data.vehicles.filter((vehicle: DriverVehicleSummary) => vehicle.is_active !== false);
  const vehicleRegistered = registeredVehicles.length > 0;
  const routeAssignments = data.routeAssignments ?? [];
  const routeRequests = data.routeRequests ?? [];
  const driverFullyVerified = paymentApproved && idApproved && vehicleApproved && vehicleRegistered;
  const canViewDriverRoutes = driverFullyVerified;
  const driverBadgeVisible = Boolean(data.driverProfile?.id_document_url && idApproved && vehicleApproved);
  const needsPaymentProof = !!data.driverProfile && !paymentProof && !paymentApproved;
  const awaitingPaymentReview = !!paymentProof && paymentStatus === 'pending';
  const awaitingBasicApproval = paymentApproved && !idApproved;
  const showVehicleCta = paymentApproved;
  const driverStatusMessage = !paymentApproved
    ? 'Complete payment verification to unlock your driver routes.'
    : !vehicleRegistered
      ? 'Add a registered vehicle before your driver verification can be completed.'
      : !idApproved || !vehicleApproved
        ? 'Complete ID and vehicle verification to unlock your driver routes.'
        : 'Your driver account is active.';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Driver Dashboard</h1>
              <p className="text-xs text-slate-600">
                Welcome back, {driverDisplayName}
              </p>
              {driverBadgeVisible ? (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified driver
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings className="w-5 h-5 text-slate-600" />
              </Link>
              <LogoutButton />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-emerald-600">{routeAssignments.length}</div>
              <div className="text-[10px] text-slate-600">Applications</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-blue-600">{routeRequests.length}</div>
              <div className="text-[10px] text-slate-600">Requests</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-purple-600">{registeredVehicles.length}</div>
              <div className="text-[10px] text-slate-600">Vehicles</div>
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
                  Please upload your subscription proof to activate your driver account.
                </p>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Payment Reference</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{paymentReference}</div>
                </div>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Amount</div>
                  <div className="text-lg font-bold text-slate-900">R{paymentAmount}</div>
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

        {awaitingPaymentReview && (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900 mb-1">Verification In Progress</h3>
                <p className="text-xs text-blue-800 mb-1.5">
                  Your subscription proof has been submitted and is being reviewed by our admin team.
                </p>
                <p className="text-[11px] text-blue-700">
                  You&apos;ll be notified once your account is verified. This usually takes 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {awaitingBasicApproval && (
          <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-purple-900 mb-1">ID Verification Required</h3>
                <p className="text-xs text-purple-800">
                  Your payment is approved. Upload and approve your ID before your vehicle and routes can be fully activated.
                </p>
              </div>
            </div>
          </div>
        )}

        {showVehicleCta && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 mb-1">
                  {vehicleRegistered ? 'Vehicle Registration In Progress' : 'Add Your Vehicle'}
                </h3>
                <p className="text-xs text-amber-800 mb-3">
                  {vehicleRegistered
                    ? 'Your vehicle details are saved. Open your vehicle page to review or update them.'
                    : 'Payment is approved. Add your vehicle now so you can continue with route applications.'}
                </p>
                {vehicleRegistered ? (
                  <Link
                    href="/dashboard/driver/vehicles"
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    View Vehicles
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/driver/vehicles/add"
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    Add Vehicle
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {canViewDriverRoutes ? (
          <>
            <div id="assigned-routes" className="mb-6 scroll-mt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Route applications & assignments</h2>
                <Link href="/dashboard/driver/routes" className="text-xs font-semibold text-emerald-600">
                  Browse routes
                </Link>
              </div>

              {routeAssignments.length > 0 ? (
                <div className="space-y-3">
                  {routeAssignments.map((assignment) => {
                    const route = assignment.official_route;
                    const requestCount = assignment.passenger_request_count || 0;

                    return (
                      <div key={assignment.id} className="bg-white border border-slate-200 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-sm font-semibold text-slate-900">
                              {route?.name || 'Route application'}
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                {assignment.status}
                              </span>
                              {driverBadgeVisible ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  <BadgeCheck className="h-3 w-3" />
                                  Verified driver
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-600 mb-2">
                              {route?.start_area || 'Start'} → {route?.end_area || 'Destination'}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                {assignment.seats_available} passenger seats available
                              </span>
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                                Weekly: R{assignment.weekly_price ?? '0'}
                              </span>
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                                Single: R{assignment.single_route_price ?? '0'}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                                <Bell className="w-3 h-3" />
                                {requestCount} request{requestCount === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              Days: {assignment.days_active?.join(', ') || 'Not set'}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <Link
                              href={`/dashboard/driver/routes/${assignment.route_id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              View route
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">No route applications yet</p>
                  <p className="text-xs text-slate-400 mt-1">Browse routes and apply when you are ready</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-2">
              {!paymentApproved ? 'Account Not Active' : !vehicleRegistered ? 'Vehicle Required' : !idApproved || !vehicleApproved ? 'Verification Pending' : 'Driver Active'}
            </h3>
            <p className="text-sm text-slate-600">
              {driverStatusMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
