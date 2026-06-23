import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, Bell, ChevronDown, Plus } from 'lucide-react';
import { getOfficialRoutes } from '@/lib/routes/actions';
import { createClient } from '@/lib/supabase/server';
import { formatVehicleCapacity } from '@/lib/types/pilot-routes';
import RouteCreatedToast from './RouteCreatedToast';

function badgeClass(status: string) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'paused') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function AdminRoutesPage() {
  const [routesResult, pendingResult] = await Promise.all([
    getOfficialRoutes(true),
    createClient().then((supabase) =>
      supabase
        .from('driver_route_assignments')
        .select('route_id, status')
        .eq('status', 'pending')
    ),
  ]);

  const { routes, error } = routesResult;
  const pendingByRoute = new Map<string, number>();

  for (const row of pendingResult.data || []) {
    const routeId = row.route_id as string | null;
    if (!routeId) continue;
    pendingByRoute.set(routeId, (pendingByRoute.get(routeId) || 0) + 1);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <RouteCreatedToast />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="mb-3">
            <Link href="/admin" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to admin
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Official Routes</h1>
              <p className="text-xs text-slate-600">Admin-created routes for active drivers and members.</p>
            </div>
            <Link
              href="/admin/routes/new"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              New Route
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
        ) : null}

        <div className="grid gap-3">
          {(routes || []).map((route) => {
            const pendingApplications = pendingByRoute.get(route.id) || 0;

            return (
            <div
              key={route.id}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="truncate text-base font-bold text-slate-900">{route.name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(route.status)}`}>
                      {route.status}
                    </span>
                    {pendingApplications > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                        <Bell className="h-3 w-3" />
                        {pendingApplications} pending
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600">
                    {route.start_area} &rarr; {route.end_area}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                      {formatVehicleCapacity(route.vehicle_capacity)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                      {route.route_stops.length} stop{route.route_stops.length === 1 ? '' : 's'}
                    </span>
                    {pendingApplications > 0 ? (
                      <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 font-semibold text-amber-900">
                        Needs review
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Assigned driver{route.assigned_drivers?.length === 1 ? '' : 's'}:{' '}
                    {route.assigned_drivers && route.assigned_drivers.length > 0
                      ? route.assigned_drivers
                          .map((assignment) => assignment.driver_name)
                          .join(', ')
                      : 'None yet'}
                  </p>
                </div>
                <Link
                  href={`/admin/routes/${route.id}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Open
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </Link>
              </div>

              <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800">
                    Assigned Drivers
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </summary>

                <div className="border-t border-slate-200 px-3 py-3">
                  {route.assigned_drivers && route.assigned_drivers.length > 0 ? (
                    <div className="space-y-3">
                      {route.assigned_drivers.map((assignment) => (
                        <div key={assignment.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="mb-2 text-sm font-semibold text-slate-900">{assignment.driver_name}</div>
                          {assignment.driver_verified ? (
                            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                              <BadgeCheck className="h-3 w-3" />
                              Verified driver
                            </div>
                          ) : null}
                          <div className="grid gap-2 text-xs text-slate-700">
                            <div>
                              <span className="text-slate-500">Status:</span>{' '}
                              <span className="font-semibold text-slate-900">{assignment.status}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Vehicle:</span>{' '}
                              <span className="font-semibold text-slate-900">{assignment.vehicle_label || 'Not linked'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Seats:</span>{' '}
                              <span className="font-semibold text-slate-900">{assignment.seats_available ?? 'Not set'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Weekly price:</span>{' '}
                              <span className="font-semibold text-slate-900">
                                {assignment.weekly_price ? `R${assignment.weekly_price}` : 'Not set'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Single route price:</span>{' '}
                              <span className="font-semibold text-slate-900">
                                {assignment.single_route_price ? `R${assignment.single_route_price}` : 'Not set'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Days active:</span>{' '}
                              <span className="font-semibold text-slate-900">
                                {assignment.days_active && assignment.days_active.length > 0
                                  ? assignment.days_active.join(', ')
                                  : 'Not set'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No drivers assigned yet.</div>
                  )}
                </div>
              </details>
            </div>
          );
          })}

          {(routes || []).length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No routes yet. Create the first official route to get started.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
