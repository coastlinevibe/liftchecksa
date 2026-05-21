import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { getOfficialRoutes } from '@/lib/routes/actions';

function badgeClass(status: string) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'paused') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function AdminRoutesPage() {
  const { routes, error } = await getOfficialRoutes(true);

  return (
    <div className="min-h-screen bg-slate-50">
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
              <p className="text-xs text-slate-600">Admin-created routes for the verified pilot.</p>
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
          {(routes || []).map((route) => (
            <Link
              key={route.id}
              href={`/admin/routes/${route.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="truncate text-base font-bold text-slate-900">{route.name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(route.status)}`}>
                      {route.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {route.start_area} &rarr; {route.end_area}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {route.route_stops.length} stop{route.route_stops.length === 1 ? '' : 's'}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" />
              </div>
            </Link>
          ))}

          {(routes || []).length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No routes yet. Create the first verified route to start the pilot.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
