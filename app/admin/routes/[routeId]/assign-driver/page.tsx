import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Route } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { assignDriverToRouteFromForm, getRouteDetail } from '@/lib/routes/actions';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';
import { formatPassengerSeats, formatVehicleCapacity } from '@/lib/types/pilot-routes';

type AssignableVehicleRow = {
  id: string;
  driver_id: string;
  seat_capacity: number | null;
  make: string | null;
  model: string | null;
  licence_plate: string | null;
};

function weekdayLabel(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export default async function AssignDriverPage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
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

  if (!isAdminRole(profile?.role) && !isSuperAdminEmail(user.email)) {
    redirect('/admin');
  }

  const detail = await getRouteDetail(routeId);
  if ('error' in detail) {
    notFound();
  }

  const { data: drivers } = await supabase
    .from('profiles')
    .select('id, user_id, first_name, surname, role')
    .eq('role', 'driver')
    .order('created_at', { ascending: false });

  const { data: driverProfiles } = await supabase
    .from('driver_profiles')
    .select('id, user_id')
    .order('created_at', { ascending: false });

  const { data: profiles } = driverProfiles?.length
    ? await supabase
        .from('profiles')
        .select('user_id, first_name, surname')
        .in(
          'user_id',
          driverProfiles.map((driverProfile) => driverProfile.user_id)
        )
    : { data: [] };

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, driver_id, seat_capacity, make, model, colour, licence_plate, verification_status, is_active')
    .eq('verification_status', 'approved')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const approvedDrivers = (drivers || []).filter((driver) => driver.role === 'driver');
  const activeVehicles = (vehicles || []) as AssignableVehicleRow[];
  const driverProfileById = new Map((driverProfiles || []).map((driverProfile) => [driverProfile.id, driverProfile]));
  const profileByUserId = new Map((profiles || []).map((profile) => [profile.user_id, profile]));

  async function assignDriverAction(formData: FormData) {
    'use server';
    await assignDriverToRouteFromForm(formData);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link href={`/admin/routes/${routeId}`} className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to route
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Review Driver Application</h1>
          <p className="text-xs text-slate-600">Choose a registered driver and matching vehicle for this route.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Route className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">{detail.route.name}</div>
              <div className="text-xs text-slate-600">
                {detail.route.start_area} &rarr; {detail.route.end_area}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {detail.stops.length} stops • {detail.route.status}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Allowed seating type</div>
          <div className="mt-1 text-sm font-bold text-violet-900">
            {formatVehicleCapacity(detail.route.vehicle_capacity)}
          </div>
          <p className="mt-1 text-xs text-violet-800">
            Only vehicles with this total capacity can be used for this route.
          </p>
          <div className="mt-1 text-[11px] text-violet-700">
            {formatPassengerSeats(detail.route.vehicle_capacity)}
          </div>
        </div>

        <form action={assignDriverAction} className="space-y-4">
          <input type="hidden" name="route_id" value={routeId} />

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Driver</label>
                <select
                  name="driver_profile_id"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select driver application</option>
                  {approvedDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.surname}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Vehicle</label>
                <select
                  name="vehicle_id"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select registered vehicle</option>
                  {activeVehicles.map((vehicle) => {
                    const ownerDriverProfile = driverProfileById.get(vehicle.driver_id);
                    const owner = ownerDriverProfile ? profileByUserId.get(ownerDriverProfile.user_id) : null;
                    const ownerName = owner ? `${owner.first_name ?? ''} ${owner.surname ?? ''}`.trim() : 'Driver';
                    return (
                      <option key={vehicle.id} value={vehicle.id}>
                        {ownerName} - {vehicle.make} {vehicle.model} ({vehicle.licence_plate}) - {formatVehicleCapacity(vehicle.seat_capacity)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Passenger Seats Available</label>
                <input
                  name="seats_available"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Weekly Price</label>
                <input
                  name="weekly_price"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Single Route Price</label>
                <input
                  name="single_route_price"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Days Active</label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-300 p-3 text-xs">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <label key={day} className="flex items-center gap-2">
                      <input type="checkbox" name="days_active" value={day} defaultChecked={['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)} />
                      {weekdayLabel(day)}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Admin Notes</label>
              <textarea
                name="admin_notes"
                rows={3}
                placeholder="Optional notes for this assignment"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Application checks
            </div>
            <p className="mt-1 text-sm text-emerald-800">
              The server will verify that the chosen driver and vehicle belong together and match the route seating type before the assignment is saved.
              Vehicles must also match the route&apos;s total seating capacity. Passenger seats are total seats minus the driver seat.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Approve Application
          </button>
        </form>
      </div>
    </div>
  );
}
