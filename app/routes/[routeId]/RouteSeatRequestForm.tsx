'use client';

import { useMemo, useState, useActionState } from 'react';
import Link from 'next/link';
import { CalendarDays, Send } from 'lucide-react';
import { requestRouteSeatFromForm } from '@/lib/routes/actions';
import type { RouteStop } from '@/lib/types/pilot-routes';

type State = {
  error?: string;
  success?: boolean;
};

const weekdayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export default function RouteSeatRequestForm({
  routeId,
  stops,
  canRequestSeat,
  isLoggedIn,
  membershipStatus,
}: {
  routeId: string;
  stops: RouteStop[];
  canRequestSeat: boolean;
  isLoggedIn: boolean;
  membershipStatus: string | null;
}) {
  const [pickupStopId, setPickupStopId] = useState(stops[0]?.id || '');
  const [dropoffStopId, setDropoffStopId] = useState(stops[stops.length - 1]?.id || '');
  const [requestedDays, setRequestedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData) => {
      const result = await requestRouteSeatFromForm(formData);
      if ('error' in result) {
        return { error: result.error, success: false };
      }

      return { error: undefined, success: true };
    },
    { error: undefined, success: false } satisfies State
  );

  const pickupIndex = useMemo(
    () => stops.findIndex((stop) => stop.id === pickupStopId),
    [pickupStopId, stops]
  );
  const dropoffIndex = useMemo(
    () => stops.findIndex((stop) => stop.id === dropoffStopId),
    [dropoffStopId, stops]
  );

  const invalidOrder =
    pickupIndex < 0 ||
    dropoffIndex < 0 ||
    pickupIndex >= dropoffIndex ||
    stops.length < 2;

  if (!canRequestSeat) {
    const promptTitle = !isLoggedIn
      ? 'Login required'
      : membershipStatus === 'suspended'
        ? 'Membership suspended'
        : membershipStatus === 'expired'
          ? 'Membership expired'
          : membershipStatus === 'active'
            ? 'Member access required'
            : 'Membership approval required';
    const promptBody = !isLoggedIn
      ? 'Log in or register as an active member to request a seat.'
      : membershipStatus === 'suspended'
        ? 'Your membership is suspended. Seat requests are disabled until support reactivates your account.'
        : membershipStatus === 'expired'
          ? 'Your membership has expired. Renew before requesting a seat.'
          : membershipStatus === 'active'
            ? 'Something is off with your member access. Please refresh or contact support.'
            : 'Your membership is not active yet. Complete payment verification to request a seat.';
    return (
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-900">{promptTitle}</h2>
        <p className="text-sm text-slate-600">{promptBody}</p>
        {!isLoggedIn ? (
          <>
            <Link
              href="/register?type=member"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Send className="h-4 w-4" />
              Request seat
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Already registered? Log in
            </Link>
          </>
        ) : (
          <Link
            href="/settings/membership"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <Send className="h-4 w-4" />
            Review membership
          </Link>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="requested_days" value={JSON.stringify(requestedDays)} />
      <input type="hidden" name="seats_requested" value="1" />

      {state?.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Seat request submitted. The driver will approve and assign a seat in one step.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Pickup stop</label>
          <select
            value={pickupStopId}
            onChange={(event) => setPickupStopId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {stops.map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.stop_order}. {stop.stop_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Drop-off stop</label>
          <select
            value={dropoffStopId}
            onChange={(event) => setDropoffStopId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {stops.map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.stop_order}. {stop.stop_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <input type="hidden" name="pickup_stop_id" value={pickupStopId} />
      <input type="hidden" name="dropoff_stop_id" value={dropoffStopId} />

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          Requested days
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-300 p-3 text-xs">
          {weekdayOptions.map((day) => (
            <label key={day} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requestedDays.includes(day)}
                onChange={(event) => {
                  setRequestedDays((current) =>
                    event.target.checked ? [...current, day] : current.filter((item) => item !== day)
                  );
                }}
              />
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <input type="hidden" name="request_type" value="weekly" />

      {invalidOrder ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Pickup must come before drop-off on the route.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || invalidOrder}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <Send className="h-4 w-4" />
        Request seat
      </button>

      <div className="text-xs text-slate-500">
        One approved request reserves one seat immediately. Seat assignment happens during approval. Cancellation is reviewed separately.
      </div>
    </form>
  );
}
