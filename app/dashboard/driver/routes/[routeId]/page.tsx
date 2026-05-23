import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, Bell, CalendarDays, MapPin, MessageSquare, Route as RouteIcon, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getRouteDetail, sendRouteChatMessageFromForm } from '@/lib/routes/actions';
import RouteChatThread, { type RouteChatMessage } from '@/components/RouteChatThread';

function badgeClass(status: string) {
  if (status === 'active' || status === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'paused' || status === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function DriverRouteDetailPage({
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
    .select('id, user_id, role, first_name, surname')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  if (profile.role === 'platform_admin' || profile.role === 'group_admin') {
    redirect(`/admin/routes/${routeId}`);
  }

  if (profile.role !== 'driver') {
    redirect('/dashboard/member');
  }

  const detail = await getRouteDetail(routeId);
  if ('error' in detail) {
    notFound();
  }

  const { route, stops, assignments, requests, ledger } = detail;
  const assignment =
    assignments.find((entry) => entry.driver_id === profile.id) ||
    assignments.find((entry) => ['approved', 'active', 'pending', 'paused'].includes(entry.status)) ||
    null;

  if (!assignment) {
    redirect('/dashboard/driver/routes');
  }

  const { data: routeChatMessages } = await supabase
    .from('route_chats')
    .select('id, route_id, assignment_id, sender_id, receiver_id, message, created_at')
    .eq('route_id', route.id)
    .eq('assignment_id', assignment.id)
    .order('created_at', { ascending: true });

  const routeRequests = requests.filter((request) => request.route_id === route.id);
  const routeLedger = ledger.filter((entry) => entry.route_id === route.id);
  const routeChatPeerId =
    routeChatMessages?.find((message) => message.sender_id !== profile.id)?.sender_id ||
    routeChatMessages?.find((message) => message.receiver_id !== profile.id)?.receiver_id ||
    routeRequests[0]?.passenger_id ||
    null;
  const { data: routeChatPeer } = routeChatPeerId
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname, role')
        .eq('id', routeChatPeerId)
        .maybeSingle()
    : { data: null };
  const driverName = `${profile.first_name || ''} ${profile.surname || ''}`.trim() || 'Driver';
  const memberName = routeChatPeer
    ? `${routeChatPeer.first_name || ''} ${routeChatPeer.surname || ''}`.trim() || 'Member'
    : 'Member';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/dashboard/driver/routes" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to assigned routes
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-emerald-600" />
                <h1 className="text-xl font-bold text-slate-900">{route.name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(assignment.status)}`}>
                  {assignment.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {route.start_area} &rarr; {route.end_area}
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium">
                <Bell className="h-3.5 w-3.5 text-rose-500" />
                {assignment.passenger_request_count || 0} requests
              </div>
              <div className="mt-2 inline-flex items-center rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                {assignment.seats_available} seats available
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-base font-bold text-slate-900">Ordered stops</h2>
            <div className="space-y-2">
              {stops.map((stop) => (
                <div key={stop.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {stop.stop_order}. {stop.stop_name}
                      </div>
                      <div className="text-xs text-slate-600">{stop.area || 'Area to be confirmed'}</div>
                    </div>
                    <MapPin className="mt-0.5 h-4 w-4 text-emerald-500" />
                  </div>
                  {stop.notes ? <p className="mt-2 text-xs text-slate-500">{stop.notes}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-base font-bold text-slate-900">Assignment summary</h2>
            <div className="grid gap-2 text-sm text-slate-600">
              <div>Driver: {driverName}</div>
              <div>Vehicle plate: {assignment.vehicle_plate || 'TBA'}</div>
              <div>Weekly price: {assignment.weekly_price ? `R${assignment.weekly_price}` : 'TBA'}</div>
              <div>Single trip price: {assignment.single_trip_price ? `R${assignment.single_trip_price}` : 'TBA'}</div>
              <div>Days: {(assignment.days_active || []).join(', ')}</div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">Direct chat</h2>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Member conversations for this route appear here.
                </p>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live chat
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                Chat with {memberName} on this route
              </div>
              <RouteChatThread
                key={`${route.id}:${assignment.id}:${(routeChatMessages || []).length}`}
                routeId={route.id}
                assignmentId={assignment.id}
                currentProfileId={profile.id}
                initialMessages={(routeChatMessages || []) as RouteChatMessage[]}
                emptyStateText="No direct chat yet. Members can start the conversation from the route page."
              />

              {routeChatPeerId ? (
                <form action={sendRouteChatMessageFromForm} className="mt-3 space-y-2">
                  <input type="hidden" name="routeId" value={route.id} />
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <input type="hidden" name="receiverId" value={routeChatPeerId} />
                  <label htmlFor="driverRouteChatMessage" className="block text-sm font-semibold text-slate-900">
                    Reply to {memberName}
                  </label>
                  <textarea
                    id="driverRouteChatMessage"
                    name="message"
                    rows={3}
                    placeholder={`Reply to ${memberName}...`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-white px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send reply
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Route requests</h2>
            </div>

            <div className="space-y-2">
              {routeRequests.length > 0 ? (
                routeRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900">Request #{request.id.slice(0, 8)}</div>
                    <div className="text-xs text-slate-600">Status: {request.status}</div>
                    <div className="text-xs text-slate-600">Days: {(request.requested_days || []).join(', ')}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No route requests yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Payment ledger</h2>
            </div>

            <div className="space-y-2">
              {routeLedger.length > 0 ? (
                routeLedger.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900">Entry #{entry.id.slice(0, 8)}</div>
                    <div className="text-xs text-slate-600">Amount: R{entry.amount}</div>
                    <div className="text-xs text-slate-600">Status: {entry.status}</div>
                    <div className="text-xs text-slate-600">Method: {entry.payment_method}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No payment ledger entries yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
