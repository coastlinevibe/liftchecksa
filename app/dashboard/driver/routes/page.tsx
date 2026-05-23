import Link from 'next/link';
import { ArrowLeft, Bell, CalendarDays, MapPin, Route as RouteIcon, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getDriverRouteDashboard } from '@/lib/routes/actions';

type DriverRouteAssignmentCard = {
  id: string;
  status: string;
  seats_available: number;
  weekly_price?: number | string | null;
  single_trip_price?: number | string | null;
  days_active?: string[] | null;
  passenger_request_count?: number | null;
  official_routes?: {
    id: string;
    name?: string | null;
    start_area?: string | null;
    end_area?: string | null;
  } | null;
};

function badgeClass(status: string) {
  if (status === 'active' || status === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'paused' || status === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function DriverRoutesPage() {
  const dashboard = await getDriverRouteDashboard();

  if ('error' in dashboard) {
    if (dashboard.error === 'Not authenticated') {
      redirect('/login');
    }
    if (dashboard.error === 'Driver access required') {
      redirect('/dashboard/member');
    }
  }

  const assignments = ('assignments' in dashboard ? dashboard.assignments ?? [] : []) as DriverRouteAssignmentCard[];
  const pendingRequests = 'pendingRequests' in dashboard ? dashboard.pendingRequests ?? [] : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/dashboard/driver" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Assigned Official Routes</h1>
          <p className="text-xs text-slate-600">Driver access for assigned official routes.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Drivers do not publish public trips. Assigned routes appear here after admin approval.
        </div>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Your assignments</h2>
          </div>

          <div className="space-y-2">
            {assignments.map((assignment) => {
              const route = assignment.official_routes;
              const requestCount = assignment.passenger_request_count || 0;
              return (
                <div key={assignment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <RouteIcon className="h-4 w-4 text-emerald-600" />
                        <h3 className="truncate text-sm font-semibold text-slate-900">{route?.name || 'Route'}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                        <span>
                          {route?.start_area} &rarr; {route?.end_area}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                          <Bell className="h-3 w-3 text-rose-500" />
                          {requestCount} request{requestCount === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">
                          {assignment.seats_available} seats available
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Link
                        href={`/dashboard/driver/routes/${route?.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-emerald-500 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        View route
                      </Link>
                      {requestCount > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                          <Bell className="h-3.5 w-3.5" />
                          {requestCount} new notification{requestCount === 1 ? '' : 's'}
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                          No new notifications
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 grid gap-1 text-xs text-slate-600">
                    <div>Weekly: {assignment.weekly_price ? `R${assignment.weekly_price}` : 'TBA'}</div>
                    <div>Single trip: {assignment.single_trip_price ? `R${assignment.single_trip_price}` : 'TBA'}</div>
                    <div>Days: {(assignment.days_active || []).join(', ')}</div>
                  </div>
                </div>
              );
            })}

            {assignments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No assigned routes yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Pending route requests</h2>
          </div>

          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-900">Request #{request.id.slice(0, 8)}</div>
                <div className="text-xs text-slate-600">
                  Route: {request.route_id.slice(0, 8)} | Status: {request.status}
                </div>
                <div className="text-xs text-slate-600">Days: {(request.requested_days || []).join(', ')}</div>
              </div>
            ))}

            {pendingRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No pending requests for your routes yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
