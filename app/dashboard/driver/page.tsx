import Link from 'next/link';
import { Bell, Calendar, Clock, MapPin, Plus, Settings } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { createClient } from '@/lib/supabase/server';
import { getDriverRouteDashboard } from '@/lib/routes/actions';
import { redirect } from 'next/navigation';

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
  single_trip_price?: number | string | null;
  passenger_request_count?: number;
  official_route?: {
    id: string;
    name?: string | null;
    start_area?: string | null;
    end_area?: string | null;
    status?: string | null;
  } | null;
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
    .single();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, rating_average, verification_status, id_status, vehicle_status')
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

  const routeDashboard = await getDriverRouteDashboard();
  const routeAssignments =
    'error' in routeDashboard ? [] : ((routeDashboard.assignments || []) as DriverRouteSummary[]);
  const routeRequests = 'error' in routeDashboard ? [] : routeDashboard.pendingRequests || [];

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

  return {
    profile,
    driverProfile,
    payment,
    vehicles: vehicles || [],
    routeAssignments,
    routeRequests,
  };
}

export default async function DriverDashboard() {
  const data = await getDriverData();

  const paymentProof = data.payment?.proof_url || data.payment?.proof_image;
  const paymentApproved = data.payment?.status === 'approved';
  const basicApproved = data.driverProfile?.id_status === 'approved';
  const approvedVehicles = data.vehicles.filter(
    (vehicle: DriverVehicleSummary) => vehicle.is_active !== false && vehicle.verification_status === 'approved'
  );
  const vehicleApproved = approvedVehicles.length > 0;
  const routeAssignments = data.routeAssignments ?? [];
  const routeRequests = data.routeRequests ?? [];
  const isActiveDriver = paymentApproved && basicApproved && vehicleApproved;
  const needsPaymentProof = !!data.payment && !paymentProof && !paymentApproved;
  const awaitingPaymentReview = !!paymentProof && data.payment?.status === 'pending';
  const awaitingBasicApproval = paymentApproved && !basicApproved;
  const awaitingVehicleApproval = paymentApproved && basicApproved && !vehicleApproved;

  return (
    <div className="min-h-screen bg-slate-50">
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

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-emerald-600">{routeAssignments.length}</div>
              <div className="text-[10px] text-slate-600">Routes</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-blue-600">{routeRequests.length}</div>
              <div className="text-[10px] text-slate-600">Requests</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-purple-600">{approvedVehicles.length}</div>
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
                  Please upload your proof of payment to activate your account.
                </p>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-600 mb-1">Payment Reference</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{data.payment?.payment_reference}</div>
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
                  Your payment proof has been submitted and is being reviewed by our admin team.
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
                <h3 className="text-sm font-bold text-purple-900 mb-1">Basic Registration Approved</h3>
                <p className="text-xs text-purple-800">
                  Your payment is approved. Complete vehicle registration and approval to activate the driver dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {awaitingVehicleApproval && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 mb-1">Vehicle Registration Pending</h3>
                <p className="text-xs text-amber-800 mb-3">
                  Payment and basic registration are approved. Submit your vehicle information to continue.
                </p>
                {data.vehicles.length > 0 ? (
                  <Link
                    href="/dashboard/driver/vehicles"
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    View Vehicle Status
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/driver/vehicles/add"
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    Submit Vehicle Info
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {isActiveDriver ? (
          <>
            <Link
              href="/dashboard/driver/routes"
              className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold mb-4 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              View Assigned Routes
            </Link>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Assigned Routes</h2>
                <Link href="/dashboard/driver/routes" className="text-xs font-semibold text-emerald-600 hover:underline">
                  Open routes
                </Link>
              </div>

              {routeAssignments.length > 0 ? (
                <div className="space-y-3">
                  {routeAssignments.map((assignment) => {
                    const route = assignment.official_route;

                    return (
                      <div key={assignment.id} className="bg-white border border-slate-200 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-sm font-semibold text-slate-900">
                                {route?.name || 'Assigned route'}
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                {assignment.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mb-2">
                              {route?.start_area || 'Start'} → {route?.end_area || 'Destination'}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                {assignment.seats_available} seats available
                              </span>
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                                Weekly: R{assignment.weekly_price ?? '0'}
                              </span>
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                                Single: R{assignment.single_trip_price ?? '0'}
                              </span>
                              {(assignment.passenger_request_count || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                                  <Bell className="w-3 h-3" />
                                  {assignment.passenger_request_count} request
                                  {assignment.passenger_request_count === 1 ? '' : 's'}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              Days: {assignment.days_active?.join(', ') || 'Not set'}
                            </div>
                          </div>
                          <Link
                            href={`/dashboard/driver/routes/${assignment.route_id}`}
                            className="rounded-lg border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            View route
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">No assigned routes yet</p>
                  <p className="text-xs text-slate-400 mt-1">Routes will appear here once admin assigns one</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Account Not Active</h3>
            <p className="text-sm text-slate-600">
              Complete payment verification to start viewing your assigned routes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
