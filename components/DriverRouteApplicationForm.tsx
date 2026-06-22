'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { BadgeCheck, CarFront, CheckCircle2, Clock3, Send } from 'lucide-react';
import { applyDriverToRouteFromForm } from '@/lib/routes/actions';
import { formatVehicleCapacity } from '@/lib/types/pilot-routes';

type DriverVehicleOption = {
  id: string;
  make: string | null;
  model: string | null;
  licence_plate: string | null;
  seat_capacity: number | null;
};

type ApplicationState = {
  error?: string;
  success?: boolean;
};

type ExistingApplication = {
  id: string;
  status: string;
  vehicle_id: string;
  created_at: string;
};

export default function DriverRouteApplicationForm({
  routeId,
  routeVehicleCapacity,
  vehicles,
  existingApplication,
  driverVerified = false,
}: {
  routeId: string;
  routeVehicleCapacity?: number | null;
  vehicles: DriverVehicleOption[];
  existingApplication?: ExistingApplication | null;
  driverVerified?: boolean;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || existingApplication?.vehicle_id || '');
  const [state, formAction, pending] = useActionState(
    async (_prev: ApplicationState, formData: FormData) => {
      const result = await applyDriverToRouteFromForm(formData);
      if ('error' in result) {
        return { error: result.error, success: false };
      }

      return { error: undefined, success: true };
    },
    { error: undefined, success: false } satisfies ApplicationState
  );
  const hasExistingApplication = Boolean(
    existingApplication && ['pending', 'approved', 'active', 'paused', 'suspended'].includes(existingApplication.status)
  );
  const applicationLocked = pending || Boolean(state?.success) || hasExistingApplication;

  if (!vehicles.length) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-700">
            <CarFront className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">No registered vehicle yet</h2>
            <p className="mt-1 text-sm text-amber-800">
              Register a vehicle before applying for routes.
            </p>
            {driverVerified ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                <BadgeCheck className="h-3 w-3" />
                Verified driver
              </div>
            ) : null}
            <Link
              href="/dashboard/driver/vehicles/add"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Register vehicle
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (hasExistingApplication) {
    const label =
      existingApplication?.status === 'pending'
        ? 'Application pending'
        : existingApplication?.status === 'approved' || existingApplication?.status === 'active'
          ? 'Application approved'
          : 'Application on hold';

    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">{label}</h2>
        </div>
        <p className="text-sm text-slate-600">
          Submitted on {new Date(existingApplication?.created_at || '').toLocaleDateString()}. Admin will review this route application.
        </p>
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
          Allowed seating type: {formatVehicleCapacity(routeVehicleCapacity)}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Apply for this route</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Choose one of your registered vehicles and submit it for admin review.
          </p>
          {driverVerified ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
              <BadgeCheck className="h-3 w-3" />
              Verified driver
            </div>
          ) : null}
        </div>
        <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          {formatVehicleCapacity(routeVehicleCapacity)}
        </div>
      </div>

      {state?.error ? (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Route application submitted. The admin will review your driver and vehicle details.
        </div>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="route_id" value={routeId} />
        <input type="hidden" name="vehicle_id" value={vehicleId} />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Approved vehicle</label>
          <select
            value={vehicleId}
            onChange={(event) => setVehicleId(event.target.value)}
            disabled={applicationLocked}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.make} {vehicle.model} - {vehicle.licence_plate} ({formatVehicleCapacity(vehicle.seat_capacity)})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Only active vehicles can be applied to routes. The selected vehicle must match the route&apos;s total seating capacity.
        </div>

        <button
          type="submit"
          disabled={applicationLocked}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          <Send className="h-4 w-4" />
          {state?.success ? 'Application In Progress' : pending ? 'Submitting application...' : 'Submit route application'}
        </button>
      </form>
    </section>
  );
}
