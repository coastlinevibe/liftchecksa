import Link from 'next/link';
import { ArrowLeft, MapPin, Route as RouteIcon, Shield, Clock3, CarFront } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOfficialRoutes } from '@/lib/routes/actions';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';
import { formatVehicleCapacity } from '@/lib/types/pilot-routes';

function formatDaysForSummary(days?: string[] | null) {
  if (!days || days.length === 0) return 'Mon, Tue, Wed, Thu, Fri';
  return days
    .map((day) => day.slice(0, 3))
    .map((day) => `${day.charAt(0).toUpperCase()}${day.slice(1).toLowerCase()}`)
    .join(', ');
}

export default async function DriverRoutesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, first_name, surname')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, verification_status, id_status, vehicle_status, provider_payment_status, provider_next_payment_at, provider_expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (isAdminRole(profile?.role) || isSuperAdminEmail(user.email)) {
    redirect('/admin');
  }

  if (!profile || (!driverProfile && profile?.role !== 'driver')) {
    redirect('/dashboard/member');
  }

  const paymentApproved =
    driverProfile?.provider_payment_status === 'approved' &&
    (!driverProfile?.provider_next_payment_at || new Date(driverProfile.provider_next_payment_at) > new Date()) &&
    (!driverProfile?.provider_expires_at || new Date(driverProfile.provider_expires_at) > new Date());
  const idApproved = driverProfile?.id_status === 'approved';
  const vehicleApproved = driverProfile?.vehicle_status === 'approved';
  const { data: registeredVehicles } = driverProfile?.id
    ? await supabase
        .from('vehicles')
        .select('id')
        .eq('driver_id', driverProfile.id)
        .eq('is_active', true)
    : { data: [] };
  const fullyVerified =
    paymentApproved &&
    idApproved &&
    vehicleApproved &&
    (registeredVehicles?.length || 0) > 0;

  const { routes: allRoutes, error } = await getOfficialRoutes(true);
  const routes = (allRoutes || []).filter((route) => route.status === 'active');

  const { data: applications } = profile?.id
    ? await supabase
        .from('driver_route_assignments')
        .select('id, route_id, status, vehicle_id, seats_available, days_active, created_at, official_routes(id, name, start_area, end_area, status, vehicle_capacity)')
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const applicationsByRouteId = new Map(
    (applications || []).map((application) => [application.route_id, application] as const)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/dashboard/driver" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Available Routes</h1>
              <p className="text-xs text-slate-600">
                {fullyVerified
                  ? 'Review active routes, then open a route to apply with one of your registered vehicles.'
                  : 'Complete payment, ID, and vehicle verification to unlock route browsing.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                {applications?.length || 0} applications
              </span>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                {registeredVehicles?.length || 0} vehicles
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4">
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
        ) : null}

        {!fullyVerified ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" />
              Route access locked
            </div>
            <p className="mt-1">
              Complete payment approval, ID verification, and vehicle verification before routes appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <CarFront className="h-4 w-4 text-emerald-600" />
                Route application flow
              </div>
              <p className="mt-1">
                1. Register your driver profile.
                <br />
                2. Add your car.
                <br />
                3. Complete ID and vehicle verification.
                <br />
                4. Once both are approved, open a route here and apply with a matching vehicle.
              </p>
            </div>

            <div className="space-y-3">
              {routes?.map((route) => {
            const application = applicationsByRouteId.get(route.id);
            const daysLabel = application ? formatDaysForSummary(application.days_active) : 'No application yet';
            const seatsLabel = application
              ? `${application.seats_available} passenger seats`
              : formatVehicleCapacity(route.vehicle_capacity);

            return (
              <Link
                key={route.id}
                href={`/dashboard/driver/routes/${route.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-emerald-600" />
                      <h2 className="truncate text-sm font-semibold text-slate-900">{route.name}</h2>
                    </div>
                    <p className="text-xs text-slate-600">
                      {route.start_area} &rarr; {route.end_area}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      <Clock3 className="mr-1 inline-block h-3 w-3" />
                      {daysLabel}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">
                        {formatVehicleCapacity(route.vehicle_capacity)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        {seatsLabel}
                      </span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                        {application ? application.status : 'Open to apply'}
                      </span>
                    </div>
                  </div>
                  <Shield className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
                  <div className="font-semibold text-slate-800">Open the route to review stops and submit an application</div>
                </div>
              </Link>
            );
              })}

              {(!routes || routes.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">No active routes found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Once admin publishes routes, they will appear here for driver applications.
                  </p>
                </div>
              ) : null}

              {registeredVehicles && registeredVehicles.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  You do not have a registered vehicle yet. Add a car before applying to routes.
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
