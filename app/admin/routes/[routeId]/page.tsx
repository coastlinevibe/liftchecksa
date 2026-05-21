import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, ListOrdered, Plus, Route, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getRouteDetail } from '@/lib/routes/actions';

function badgeClass(status: string) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'paused') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function AdminRouteDetailPage({
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

  if (!profile || !['platform_admin', 'group_admin'].includes(profile.role)) {
    redirect('/admin');
  }

  const detail = await getRouteDetail(routeId);
  if ('error' in detail) {
    notFound();
  }

  const { route, stops, assignments, requests, ledger } = detail;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link href="/admin/routes" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to routes
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{route.name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(route.status)}`}>
                  {route.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {route.start_area} &rarr; {route.end_area}
              </p>
            </div>
            <Link
              href={`/admin/routes/${route.id}/assign-driver`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              Assign Driver
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Route className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Ordered Stops</h2>
            </div>
            <div className="space-y-2">
              {stops.map((stop) => (
                <div key={stop.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {stop.stop_order}. {stop.stop_name}
                      </div>
                      <div className="text-xs text-slate-600">
                        {stop.area || 'No area set'}
                        {stop.is_start ? ' • Start' : ''}
                        {stop.is_end ? ' • Destination' : ''}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {stop.estimated_morning_time ? <div>AM {stop.estimated_morning_time}</div> : null}
                      {stop.estimated_return_time ? <div>PM {stop.estimated_return_time}</div> : null}
                    </div>
                  </div>
                  {stop.notes ? <p className="mt-2 text-xs text-slate-500">{stop.notes}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Assigned Drivers</h2>
            </div>
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Assignment #{assignment.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-slate-600">
                        Status: {assignment.status} • Seats: {assignment.seats_available}
                      </div>
                      <div className="text-xs text-slate-600">
                        Weekly: {assignment.weekly_price ? `R${assignment.weekly_price}` : 'TBA'} • Single:{' '}
                        {assignment.single_trip_price ? `R${assignment.single_trip_price}` : 'TBA'}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      Requests: {assignment.passenger_request_count || 0}
                    </div>
                  </div>
                </div>
              ))}
              {assignments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No drivers assigned yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Passenger Requests</h2>
            </div>
            <div className="space-y-2">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">Request #{request.id.slice(0, 8)}</div>
                  <div className="text-xs text-slate-600">
                    Status: {request.status} • Type: {request.request_type}
                  </div>
                  <div className="text-xs text-slate-600">
                    Days: {(request.requested_days || []).join(', ')}
                  </div>
                </div>
              ))}
              {requests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No passenger requests yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Ledger Preview</h2>
            </div>
            <div className="space-y-2">
              {ledger.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">R{entry.amount}</div>
                  <div className="text-xs text-slate-600">
                    {entry.payment_method} • {entry.status} • payout {entry.payout_status}
                  </div>
                </div>
              ))}
              {ledger.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No payment ledger entries yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
