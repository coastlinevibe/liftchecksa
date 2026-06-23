'use client';

import Image from 'next/image';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { createOfficialRouteFromForm } from '@/lib/routes/actions';
import {
  formatPassengerSeats,
  formatVehicleCapacity,
  type RouteStopInput,
  type VehicleCapacity,
} from '@/lib/types/pilot-routes';

type State = {
  error?: string;
  success?: boolean;
};

type RouteStopDraft = RouteStopInput & { id: string };

const createStopId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const emptyStop = (label = ''): RouteStopDraft => ({
  id: createStopId(),
  stop_name: label,
  area: '',
  notes: '',
  estimated_morning_time: '',
  estimated_return_time: '',
});

const vehicleTypeCards: Array<{ seats: VehicleCapacity; label: string }> = [
  { seats: 4, label: '4 Seater' },
  { seats: 5, label: '5 Seater' },
  { seats: 7, label: '7 Seater' },
  { seats: 10, label: '10 Seater' },
  { seats: 12, label: '12 Seater' },
];

export default function RouteBuilderForm() {
  const router = useRouter();
  const [stops, setStops] = useState<RouteStopDraft[]>([
    emptyStop('Start'),
    emptyStop('Destination'),
  ]);
  const [vehicleCapacity, setVehicleCapacity] = useState<VehicleCapacity | null>(null);
  const [state, formAction, pending] = useActionState(async (_prev: State, formData: FormData) => {
    formData.set('stops_json', JSON.stringify(stops));
    if (vehicleCapacity) {
      formData.set('vehicle_capacity', String(vehicleCapacity));
    }
    const result = await createOfficialRouteFromForm(formData);
    if ('error' in result) {
      return { error: result.error, success: false };
    }

    return { error: undefined, success: true };
  }, { error: undefined, success: false } satisfies State);

  const stopCountLabel = useMemo(() => `${stops.length} stop${stops.length === 1 ? '' : 's'}`, [stops.length]);

  useEffect(() => {
    if (state?.success) {
      router.push('/admin/routes?route_created=1');
    }
  }, [router, state?.success]);

  function updateStop(index: number, patch: Partial<RouteStopInput>) {
    setStops((current) => current.map((stop, currentIndex) => (currentIndex === index ? { ...stop, ...patch } : stop)));
  }

  function moveStop(index: number, direction: -1 | 1) {
    setStops((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function removeStop(index: number) {
    setStops((current) => {
      if (current.length <= 2) {
        return current;
      }

      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Route Name</label>
          <input
            name="name"
            required
            placeholder="Morning CBD to Bellville"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Start Area</label>
            <input
              name="start_area"
              required
              placeholder="Cape Town CBD"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">End Area</label>
            <input
              name="end_area"
              required
              placeholder="Bellville"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Route Type</label>
            <select
              name="route_type"
              defaultValue="work_commute"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="work_commute">Work commute</option>
              <option value="school_run">School run</option>
              <option value="market_route">Market route</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
            <select
              name="status"
              defaultValue="draft"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">Select allowed seating type</h2>
          <p className="text-xs text-slate-500">Choose the seat capacity that can apply to this route.</p>
        </div>

        <input type="hidden" name="vehicle_capacity" value={vehicleCapacity ?? ''} />

        <div className="flex gap-3 overflow-x-auto pb-1">
          {vehicleTypeCards.map((card) => {
            const selected = vehicleCapacity === card.seats;
            const capacityLabel = formatVehicleCapacity(card.seats);
            const passengerSeatLabel = formatPassengerSeats(card.seats);

            return (
              <button
                key={card.seats}
                type="button"
                onClick={() => setVehicleCapacity(card.seats)}
                className={`min-w-[152px] shrink-0 rounded-xl border p-2 text-left transition ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                }`}
              >
                <div className="relative mb-2 aspect-[5/4] overflow-hidden rounded-lg bg-white">
                  <Image
                    src="/images/car1.png"
                    alt={`${card.label} vehicle`}
                    fill
                    className="object-contain p-0.5"
                    sizes="152px"
                  />
                </div>
                <div className="text-[10px] font-semibold text-slate-900">{card.label}</div>
                <div className="text-[9px] leading-tight text-slate-500">
                  {capacityLabel}
                </div>
                <div className="text-[9px] leading-tight text-slate-400">
                  {passengerSeatLabel}
                </div>
                <div className="text-[9px] text-slate-500 leading-tight">
                  {selected ? 'Selected' : 'Tap to choose'}
                </div>
              </button>
            );
          })}
        </div>

        {vehicleCapacity ? (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            Vehicles with {formatVehicleCapacity(vehicleCapacity)} can apply to this route. Other seating types will
            be denied with &quot;not the correct vehicle seating type&quot;.
          </div>
        ) : (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Select one allowed seating type before creating the route.
          </div>
        )}
      </div>

      <input type="hidden" name="stops_json" value={JSON.stringify(stops)} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ordered Stops</h2>
            <p className="text-xs text-slate-500">Build the route in order. Current: {stopCountLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setStops((current) => [...current, emptyStop(`Stop ${current.length}`)])}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Add Stop
          </button>
        </div>

        <div className="space-y-3">
          {stops.map((stop, index) => (
            <div key={stop.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  {index === 0 ? 'Start' : index === stops.length - 1 ? 'Destination' : `Stop ${index}`}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStop(index, -1)}
                    disabled={index === 0}
                    className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 disabled:opacity-40"
                    aria-label="Move stop up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStop(index, 1)}
                    disabled={index === stops.length - 1}
                    className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 disabled:opacity-40"
                    aria-label="Move stop down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStop(index)}
                    disabled={stops.length <= 2}
                    className="rounded-md border border-rose-200 bg-white p-2 text-rose-600 disabled:opacity-40"
                    aria-label="Remove stop"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Stop name</label>
                  <input
                    value={stop.stop_name}
                    onChange={(event) => updateStop(index, { stop_name: event.target.value })}
                    placeholder="Stop name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Area</label>
                  <input
                    value={stop.area || ''}
                    onChange={(event) => updateStop(index, { area: event.target.value })}
                    placeholder="Neighbourhood or suburb"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Morning time</label>
                  <input
                    type="time"
                    value={stop.estimated_morning_time || ''}
                    onChange={(event) => updateStop(index, { estimated_morning_time: event.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Return time</label>
                  <input
                    type="time"
                    value={stop.estimated_return_time || ''}
                    onChange={(event) => updateStop(index, { estimated_return_time: event.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
                  <textarea
                    value={stop.notes || ''}
                    onChange={(event) => updateStop(index, { notes: event.target.value })}
                    rows={2}
                    placeholder="Optional notes for this stop"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Admin-created routes are the public route flow. Drivers will apply with a registered vehicle and be assigned after review.
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {pending ? 'Saving route...' : 'Create Route'}
      </button>
    </form>
  );
}
