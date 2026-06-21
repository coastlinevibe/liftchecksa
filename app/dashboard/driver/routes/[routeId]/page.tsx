import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Bell, CalendarDays, MapPin, MessageSquare, Route as RouteIcon, Users } from 'lucide-react';
import { getDisplayName } from '@/lib/display-name';
import { createClient } from '@/lib/supabase/server';
import { getDriverRouteDetail, sendRouteChatMessageFromForm } from '@/lib/routes/actions';
import RouteChatThread, { type RouteChatMessage } from '@/components/RouteChatThread';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';

function badgeClass(status: string) {
  if (status === 'active' || status === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'paused' || status === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function formatStopTime(value?: string | null) {
  if (!value) return null;
  const [hours = '', minutes = ''] = value.split(':');
  if (!hours || !minutes) return value;
  const hourNumber = Number(hours);
  const suffix = hourNumber >= 12 ? 'pm' : 'am';
  return `${hours.padStart(2, '0')}:${minutes} ${suffix}`;
}

function formatPreferredTime(morning?: string | null, returnTime?: string | null) {
  const parts: string[] = [];
  if (morning) parts.push(`AM ${morning}`);
  if (returnTime) parts.push(`PM ${returnTime}`);
  return parts.length > 0 ? parts.join(' • ') : 'Not set';
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

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, user_id, id_status, vehicle_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (isAdminRole(profile?.role) || isSuperAdminEmail(user.email)) {
    redirect(`/admin/routes/${routeId}`);
  }

  const isDriver = profile?.role === 'driver' || !!driverProfile;
  if (!isDriver) {
    redirect('/dashboard/member');
  }

  const detail = await getDriverRouteDetail(routeId);
  if ('error' in detail) {
    notFound();
  }

  const { route, stops, assignments, requests, ledger } = detail;
  const driverIds = [profile?.id, driverProfile?.id].filter(Boolean) as string[];
  const { data: directAssignment } = driverIds.length
    ? await supabase
        .from('driver_route_assignments')
        .select('id, driver_id, vehicle_id, route_id, status, seats_available, days_active, weekly_price, single_route_price, created_at')
        .eq('route_id', route.id)
        .in('driver_id', driverIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const assignment =
    (directAssignment as typeof assignments[number] | null) ||
    assignments.find((entry) => entry.driver_id === profile?.id || entry.driver_id === driverProfile?.id) ||
    assignments.find((entry) => ['approved', 'active', 'pending', 'paused'].includes(entry.status)) ||
    assignments[0] ||
    null;
  const routeIsLive = Boolean(assignment && ['approved', 'active'].includes(assignment.status));

  const { data: routeChatMessages } = assignment && routeIsLive
    ? await supabase
        .from('route_chats')
        .select('id, route_id, assignment_id, sender_id, receiver_id, message, created_at')
        .eq('route_id', route.id)
        .eq('assignment_id', assignment.id)
        .order('created_at', { ascending: true })
    : { data: [] };

  const routeRequests = requests.filter((request) => request.route_id === route.id);
  const routeLedger = ledger.filter((entry) => entry.route_id === route.id);
  const assignmentRequest = assignment
    ? routeRequests.find((request) => request.matched_assignment_id === assignment.id && request.passenger_id) ||
      routeRequests.find((request) => request.passenger_id) ||
      null
    : null;
  const inferredRouteChatPeerId =
    assignmentRequest?.passenger_id ||
    routeChatMessages?.find((message) => message.sender_id !== profile?.id)?.sender_id ||
    routeChatMessages?.find((message) => message.receiver_id !== profile?.id)?.receiver_id ||
    null;
  const { data: routeChatPeer } = inferredRouteChatPeerId
    ? await supabase
        .from('profiles')
        .select('id, user_id, first_name, surname, role')
        .or(`id.eq.${inferredRouteChatPeerId},user_id.eq.${inferredRouteChatPeerId}`)
        .maybeSingle()
    : { data: null };
  const driverName = getDisplayName({
    firstName: profile?.first_name,
    surname: profile?.surname,
    email: user.email ?? null,
    fallback: 'Driver',
  });
  const memberName = routeChatPeer
    ? `${routeChatPeer.first_name || ''} ${routeChatPeer.surname || ''}`.trim() || 'Member'
    : 'Member';
  const verifiedDriver = Boolean(
    driverProfile?.id_status === 'approved' &&
      driverProfile?.vehicle_status === 'approved'
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 md:pb-0">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/dashboard/driver#assigned-routes" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to assigned routes
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-emerald-600" />
                <h1 className="text-xl font-bold text-slate-900">{route.name}</h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(assignment?.status || 'paused')}`}
                >
                  {assignment?.status || 'unassigned'}
                </span>
                {verifiedDriver ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <BadgeCheck className="h-3 w-3" />
                    Verified driver
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-slate-600">
                {route.start_area} &rarr; {route.end_area}
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium">
                <Bell className="h-3.5 w-3.5 text-rose-500" />
                {assignment?.passenger_request_count || 0} requests
              </div>
              <div className="mt-2 inline-flex items-center rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                {assignment?.seats_available ?? 0} passenger seats available
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
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">
                        {formatStopTime(stop.estimated_morning_time) || 'AM time pending'}
                        {' · '}
                        {formatStopTime(stop.estimated_return_time) || 'PM time pending'}
                      </div>
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
              <div>Vehicle plate: {assignment?.vehicle_plate || 'TBA'}</div>
              <div>Weekly price: {assignment?.weekly_price ? `R${assignment.weekly_price}` : 'TBA'}</div>
              <div>Single route price: {assignment?.single_route_price ? `R${assignment.single_route_price}` : 'TBA'}</div>
              <div>Days: {(assignment?.days_active || []).join(', ')}</div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span>Chat with {memberName} on this route</span>
                  {verifiedDriver ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <BadgeCheck className="h-3 w-3" />
                      Verified driver
                    </span>
                  ) : null}
                </div>
              </div>
              {assignment && routeIsLive ? (
                <RouteChatThread
                  key={`${route.id}:${assignment.id}:${(routeChatMessages || []).length}`}
                  routeId={route.id}
                  assignmentId={assignment.id}
                  currentProfileId={profile?.id || user.id}
                  initialMessages={(routeChatMessages || []) as RouteChatMessage[]}
                  emptyStateText="No direct chat yet. Members can start the conversation from the route page."
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600">
                  Route details are available, but no assignment is being resolved for this driver session yet.
                </div>
              )}

              {assignment && inferredRouteChatPeerId && profile?.id ? (
                <form action={sendRouteChatMessageFromForm} className="mt-3 space-y-2">
                  <input type="hidden" name="routeId" value={route.id} />
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <input type="hidden" name="receiverId" value={routeChatPeer?.id || inferredRouteChatPeerId} />
                  <label htmlFor="driverRouteChatMessage" className="block text-sm font-semibold text-slate-900">
                    Reply to {memberName}
                  </label>
                  <textarea
                    id="driverRouteChatMessage"
                    name="message"
                    rows={3}
                    required
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
              ) : assignment ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600">
                  This route application is not live yet. Chat will unlock after admin approves the assignment.
                </div>
              ) : !profile?.id ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  Driver profile lookup is still resolving. The route is open, but chat controls need the profile row to load.
                </div>
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
                    <div className="text-sm font-semibold text-slate-900">
                      {request.passenger_name || `Passenger ${request.passenger_id.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-slate-600">Status: {request.status}</div>
                    <div className="text-xs text-slate-600">Seats: {request.seats_requested ?? 1}</div>
                    <div className="text-xs text-slate-600">Days: {(request.requested_days || []).join(', ')}</div>
                    <div className="text-xs text-slate-600">
                      Time: {formatPreferredTime(request.preferred_morning_time, request.preferred_return_time)}
                    </div>
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
