import Link from 'next/link';
import { MapPin, Search, Shield, Route as RouteIcon } from 'lucide-react';
import { getOfficialRoutes } from '@/lib/routes/actions';

type SearchParams = {
  pickup_area?: string | string[];
  destination_area?: string | string[];
};

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function formatStopList(stopNames: string[]) {
  return stopNames.join(' / ');
}

export default async function RoutesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const pickupQuery = firstValue(resolvedSearchParams?.pickup_area).trim().toLowerCase();
  const destinationQuery = firstValue(resolvedSearchParams?.destination_area).trim().toLowerCase();

  const { routes, error } = await getOfficialRoutes(false);

  const filteredRoutes = (routes || []).filter((route) => {
    const endStop = route.route_stops[route.route_stops.length - 1];
    const pickupMatch =
      !pickupQuery ||
      route.start_area.toLowerCase().includes(pickupQuery) ||
      route.route_stops.some((stop) => (stop.area || stop.stop_name).toLowerCase().includes(pickupQuery));
    const destinationMatch =
      !destinationQuery ||
      route.end_area.toLowerCase().includes(destinationQuery) ||
      (endStop?.area || endStop?.stop_name || '').toLowerCase().includes(destinationQuery);

    return pickupMatch && destinationMatch && route.status === 'active';
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Official Routes</h1>
              <p className="text-xs text-slate-600">Admin-managed routes with ordered stops and seat requests.</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Admin managed
            </div>
          </div>

          <form method="get" action="/routes" className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              <input
                name="pickup_area"
                defaultValue={firstValue(resolvedSearchParams?.pickup_area)}
                placeholder="Pickup area"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="destination_area"
                defaultValue={firstValue(resolvedSearchParams?.destination_area)}
                placeholder="Destination area"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4">
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
        ) : null}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Active Routes</h2>
          <span className="text-xs text-slate-500">{filteredRoutes.length} results</span>
        </div>

        <div className="space-y-3">
          {filteredRoutes.map((route) => {
            const stopNames = route.route_stops.map((stop) => stop.stop_name);
            const routeStopsLabel = formatStopList(stopNames);
            const firstStop = route.route_stops[0];
            const lastStop = route.route_stops[route.route_stops.length - 1];

            return (
              <Link
                key={route.id}
                href={`/routes/${route.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-500"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-emerald-600" />
                      <h3 className="truncate text-base font-bold text-slate-900">{route.name}</h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      {route.start_area} &rarr; {route.end_area}
                    </p>
                  </div>
                  <Shield className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Route stops</div>
                  <div className="mt-1">{routeStopsLabel}</div>
                  <div className="mt-2">
                    {firstStop?.estimated_morning_time ? `AM ${firstStop.estimated_morning_time}` : 'AM TBA'}
                    {lastStop?.estimated_return_time ? ` | PM ${lastStop.estimated_return_time}` : ' | PM TBA'}
                  </div>
                </div>
              </Link>
            );
          })}

          {filteredRoutes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-900">No active routes found</p>
              <p className="mt-1 text-xs text-slate-500">
                The admin team will publish official routes here as they become available.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
