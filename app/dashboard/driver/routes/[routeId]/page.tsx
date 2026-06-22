import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Bell, CalendarDays, ChevronDown, MapPin, MessageSquare, Route as RouteIcon, Send, Users } from 'lucide-react';
import { getDisplayName } from '@/lib/display-name';
import { createClient } from '@/lib/supabase/server';
import { approveRouteSeatRequest, getDriverRouteDetail, rejectRouteSeatRequest, removeRouteSeatPassenger, reviewRouteSeatCancellation } from '@/lib/routes/actions';
import RouteChatThread from '@/components/RouteChatThread';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';
import {
  getOpenRouteChatView,
  reportOpenRouteChatParticipantFromForm,
  sendOpenRouteChatMessageFromForm,
} from '@/lib/routes/open-chat';

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
  return parts.length > 0 ? parts.join(' - ') : 'Not set';
}

function formatSeatRequestStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending review';
    case 'approved':
      return 'Seat reserved';
    case 'assigned':
      return 'Seat assigned';
    case 'cancellation_requested':
      return 'Cancellation pending';
    case 'suspended':
      return 'Passenger inactive';
    case 'cancelled':
      return 'Cancelled';
    case 'removed':
      return 'Removed';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}
function SeatAvatar({ avatarUrl, label }: { avatarUrl?: string | null; label: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="Passenger avatar" width={40} height={40} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      )}
    </div>
  );
}

async function approveSeatRequestAction(formData: FormData) {
  'use server';
  await approveRouteSeatRequest(formData);
}

async function rejectSeatRequestAction(formData: FormData) {
  'use server';
  await rejectRouteSeatRequest(formData);
}

async function reviewCancellationAction(formData: FormData) {
  'use server';
  await reviewRouteSeatCancellation(formData);
}

async function removePassengerAction(formData: FormData) {
  'use server';
  await removeRouteSeatPassenger(formData);
}
export default async function DriverRouteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ routeId: string }>;
  searchParams?: Promise<{ chat_error?: string }>;
}) {
  const { routeId } = await params;
  const resolvedSearchParams = await searchParams;
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
  const routeChatViewResult = routeIsLive ? await getOpenRouteChatView(route.id) : null;
  const routeChatView = routeChatViewResult && !('error' in routeChatViewResult) ? routeChatViewResult : null;

  const routeRequests = requests.filter((request) => request.route_id === route.id);
  const routeLedger = ledger.filter((entry) => entry.route_id === route.id);
  const driverName = getDisplayName({
    firstName: profile?.first_name,
    surname: profile?.surname,
    email: user.email ?? null,
    fallback: 'Driver',
  });
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
          {resolvedSearchParams?.chat_error ? (
            <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {resolvedSearchParams.chat_error}
            </section>
          ) : null}

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
                        {' Ã‚Â· '}
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
                  <h2 className="text-base font-bold text-slate-900">Route chat</h2>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Members joined to this route can read and post messages here.
                </p>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {routeChatView?.participants.length || 0} joined
              </div>
            </div>

            {routeChatView ? (
              <>
                <RouteChatThread
                  threadId={routeChatView.thread_id || route.id}
                  currentProfileId={profile?.id || user.id}
                  participants={routeChatView.participants}
                  initialMessages={routeChatView.messages}
                  emptyStateText="No route messages yet. Joined members will appear here once they start chatting."
                />

                {routeChatView.can_post ? (
                  <form action={sendOpenRouteChatMessageFromForm} className="mt-3 space-y-2">
                    <input type="hidden" name="routeId" value={route.id} />
                    <label htmlFor="driverRouteChatMessage" className="block text-sm font-semibold text-slate-900">
                      Message the route chat
                    </label>
                    <textarea
                      id="driverRouteChatMessage"
                      name="message"
                      rows={3}
                      required
                      placeholder="Write a message to joined route members..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-white px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                    >
                      <Send className="h-4 w-4" />
                      Send message
                    </button>
                  </form>
                ) : null}

                {routeChatView.can_report ? (
                  <form action={reportOpenRouteChatParticipantFromForm} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <input type="hidden" name="routeId" value={route.id} />
                    <div className="text-sm font-semibold text-slate-900">Report a passenger</div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="reportedProfileId">
                      Passenger
                    </label>
                    <select
                      id="reportedProfileId"
                      name="reportedProfileId"
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="">Select a joined passenger</option>
                      {routeChatView.participants.map((participant) => (
                        <option key={participant.id} value={participant.profile_id}>
                          {participant.display_name}
                        </option>
                      ))}
                    </select>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="reportReason">
                      Reason
                    </label>
                    <textarea
                      id="reportReason"
                      name="reason"
                      rows={3}
                      required
                      placeholder="Explain what happened..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500 bg-white px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Report passenger
                    </button>
                  </form>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                Route chat unlocks after the route is approved and assigned.
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Route requests</h2>
            </div>

            <div className="space-y-3">
              {routeRequests.length > 0 ? (
                routeRequests.map((request) => {
                  const isPending = request.status === 'pending';
                  const hasCancellationRequest = request.status === 'cancellation_requested';
                  const passengerInactive = request.status === 'suspended' || request.passenger_membership_status !== 'active';
                  const showRemovalAction = ['approved', 'assigned', 'cancellation_requested', 'suspended'].includes(request.status);
                  return (
                    <details key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <SeatAvatar avatarUrl={request.passenger_avatar_url} label={request.passenger_name?.slice(0, 2).toUpperCase() || 'P'} />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">
                                {request.passenger_name || `Passenger ${request.passenger_id.slice(0, 8)}`}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">Status: {formatSeatRequestStatusLabel(request.status)}</div>
                              {passengerInactive ? (
                                <div className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                  Passenger inactive
                                </div>
                              ) : null}
                              <div className="mt-1 text-xs text-slate-600">Seats: {request.seats_requested ?? 1}</div>
                              <div className="mt-1 text-xs text-slate-600">Days: {(request.requested_days || []).join(', ') || 'Not set'}</div>
                              <div className="mt-1 text-xs text-slate-600">
                                Time: {formatPreferredTime(request.preferred_morning_time, request.preferred_return_time)}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                            <ChevronDown className="h-3.5 w-3.5" />
                            Expand
                          </div>
                        </div>
                      </summary>

                      <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                          <div>Pickup stop: {request.pickup_stop_name || 'Unavailable'}</div>
                          <div>Drop-off stop: {request.dropoff_stop_name || 'Unavailable'}</div>
                          <div>Seat number: {request.seat_number || 'Selected during approval'}</div>
                          <div>Submitted: {new Date(request.created_at).toLocaleDateString()}</div>
                        </div>

                        {isPending ? (
                          <form action={approveSeatRequestAction} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                            <input type="hidden" name="routeId" value={route.id} />
                            <input type="hidden" name="requestId" value={request.id} />
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Review request</div>
                            <p className="mt-1 text-sm text-emerald-900">Choose a seat number, then approve or reject the request.</p>
                            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-emerald-700" htmlFor={`seat-number-${request.id}`}>
                              Seat number
                            </label>
                            <input
                              id={`seat-number-${request.id}`}
                              name="seatNumber"
                              type="number"
                              min={1}
                              defaultValue={request.seat_number || ''}
                              className="mt-2 w-28 rounded-lg border border-emerald-300 px-3 py-2 text-sm"
                              placeholder="Seat"
                              required
                            />
                            <button
                              type="submit"
                              className="mt-3 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              Approve and assign seat
                            </button>
                          </form>
                        ) : null}

                        {isPending ? (
                          <form action={rejectSeatRequestAction} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                            <input type="hidden" name="routeId" value={route.id} />
                            <input type="hidden" name="requestId" value={request.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
                            >
                              Reject request
                            </button>
                          </form>
                        ) : null}

                        {hasCancellationRequest ? (
                          <form action={reviewCancellationAction} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <input type="hidden" name="routeId" value={route.id} />
                            <input type="hidden" name="requestId" value={request.id} />
                            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Cancellation review</div>
                            <p className="mt-1 text-sm text-amber-900">Approve to release the reserved seat or reject to keep the seat reserved.</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="submit"
                                name="decision"
                                value="approved"
                                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                              >
                                Approve cancellation
                              </button>
                              <button
                                type="submit"
                                name="decision"
                                value="rejected"
                                className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-300 hover:bg-amber-100"
                              >
                                Reject cancellation
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {showRemovalAction ? (
                          <form action={removePassengerAction} className="rounded-lg border border-slate-200 bg-white p-3">
                            <input type="hidden" name="routeId" value={route.id} />
                            <input type="hidden" name="requestId" value={request.id} />
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`remove-reason-${request.id}`}>
                              Removal reason
                            </label>
                            <textarea
                              id={`remove-reason-${request.id}`}
                              name="reason"
                              rows={2}
                              required
                              placeholder="Explain why this passenger is being removed"
                              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                            <button
                              type="submit"
                              className="mt-3 inline-flex items-center justify-center rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
                            >
                              Remove passenger
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </details>
                  );
                })
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
