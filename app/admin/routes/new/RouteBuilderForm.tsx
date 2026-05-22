'use client';

import { useActionState, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { createOfficialRouteFromForm } from '@/lib/routes/actions';
import type { RouteStopInput } from '@/lib/types/pilot-routes';

type State = {
  error?: string;
  success?: boolean;
};

const emptyStop = (label = ''): RouteStopInput => ({
  stop_name: label,
  area: '',
  notes: '',
  estimated_morning_time: '',
  estimated_return_time: '',
});

export default function RouteBuilderForm() {
  const [stops, setStops] = useState<RouteStopInput[]>([
    emptyStop('Start'),
    emptyStop('Destination'),
  ]);
  const [state, formAction, pending] = useActionState(async (_prev: State, formData: FormData) => {
    formData.set('stops_json', JSON.stringify(stops));
    const result = await createOfficialRouteFromForm(formData);
    if ('error' in result) {
      return { error: result.error, success: false };
    }

    return { error: undefined, success: true };
  }, { error: undefined, success: false } satisfies State);

  const stopCountLabel = useMemo(() => `${stops.length} stop${stops.length === 1 ? '' : 's'}`, [stops.length]);

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

      {state?.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Route created successfully.
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
            <div key={`${index}-${stop.stop_name}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
        Admin-created routes are the public route flow. Drivers will be assigned after verification.
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
