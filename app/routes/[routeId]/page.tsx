import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, MessageSquare, Route as RouteIcon, Send, Shield } from 'lucide-react';
import { getRouteDetail, requestRouteSeatCancellation } from '@/lib/routes/actions';
import { formatVehicleCapacity, getPassengerSeatCapacity } from '@/lib/types/pilot-routes';
import { createClient } from '@/lib/supabase/server';
import RouteChatThread from '@/components/RouteChatThread';
import RouteSeatRequestForm from './RouteSeatRequestForm';
import { joinOpenRouteChatFromForm, getOpenRouteChatView, sendOpenRouteChatMessageFromForm } from '@/lib/routes/open-chat';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SeatRequestSummary = {
  id: string;
  passenger_id: string;
  route_id: string;
  pickup_stop_id: string;
  dropoff_stop_id: string;
  seats_requested?: number | null;
  requested_days: string[];
  request_type: string;
  preferred_morning_time?: string | null;
  preferred_return_time?: string | null;
  status: string;
  seat_number?: number | null;
  passenger_avatar_url?: string | null;
  passenger_membership_status?: string | null;
  created_at: string;
  updated_at: string;
};

function formatRouteStopTime(value?: string | null) {
  if (!value) return null;
  const [hours = '', minutes = ''] = value.split(':');
  if (!hours || !minutes) return value;
  const hourNumber = Number(hours);
  const suffix = hourNumber >= 12 ? 'pm' : 'am';
  return `${hours.padStart(2, '0')}:${minutes} ${suffix}`;
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

function formatRouteStopLabel(stopName?: string | null, fallback?: string) {
  return stopName || fallback || 'Stop pending';
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

async function requestSeatCancellationAction(formData: FormData) {
  'use server';
  await requestRouteSeatCancellation(formData);
}
export default async function RouteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ routeId: string }>;
  searchParams?: Promise<{ chat_error?: string }>;
}) {
  const { routeId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const detail = await getRouteDetail(routeId);

  if ('error' in detail) {
    notFound();
  }

  const { route, stops } = detail;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('id, role, membership_status, first_name, surname, profile_photo_url')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };
  const { data: latestPayment } = user
    ? await supabase
        .from('payments')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const isLoggedIn = Boolean(user);
  const membershipActive = profile?.membership_status === 'active';
  const isMemberUser = profile?.role === 'member';
  const canRequestSeat = Boolean(isLoggedIn && isMemberUser && membershipActive);
  const passengerSeatCapacity = getPassengerSeatCapacity(route.vehicle_capacity) || 0;
  const seatRequestStatuses = ['pending', 'approved', 'assigned', 'cancellation_requested', 'suspended'] as const;

  const activeSeatRequestsResult = isMemberUser && membershipActive
    ? await supabase
        .from('route_seat_requests')
        .select('id, passenger_id, route_id, status, seat_number, passenger_avatar_url, pickup_stop_id, dropoff_stop_id, seats_requested, requested_days, request_type, preferred_morning_time, preferred_return_time, created_at, updated_at')
        .eq('route_id', route.id)
        .in('status', ['approved', 'assigned', 'cancellation_requested', 'suspended'])
        .order('seat_number', { ascending: true })
        .order('created_at', { ascending: true })
    : { data: [] };
  const activeSeatRequests = ((activeSeatRequestsResult.data || []) as SeatRequestSummary[]).filter(Boolean);
  const seatRequestsByNumber = new Map<number, SeatRequestSummary>();

  for (const request of activeSeatRequests) {
    if (request.seat_number) {
      seatRequestsByNumber.set(request.seat_number, request);
    }
  }

  const currentSeatRequestResult = isLoggedIn && profile?.id
    ? await supabase
        .from('route_seat_requests')
        .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, seats_requested, requested_days, request_type, preferred_morning_time, preferred_return_time, status, seat_number, passenger_avatar_url, created_at, updated_at')
        .eq('route_id', route.id)
        .eq('passenger_id', profile.id)
        .in('status', seatRequestStatuses as unknown as string[])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const currentSeatRequest = currentSeatRequestResult.data ? (currentSeatRequestResult.data as SeatRequestSummary) : null;

  const stopById = new Map(stops.map((stop) => [stop.id, stop] as const));
  const openRouteChatViewResult = isMemberUser && membershipActive
    ? await getOpenRouteChatView(route.id)
    : null;
  const openRouteChatView = openRouteChatViewResult && !('error' in openRouteChatViewResult)
    ? openRouteChatViewResult
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 md:pb-0">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/routes" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to routes
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-emerald-600" />
                <h1 className="text-xl font-bold text-slate-900">{route.name}</h1>
              </div>
              <p className="text-sm text-slate-600">
                {route.start_area} &rarr; {route.end_area}
              </p>
              <div className="mt-2">
                <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                  {formatVehicleCapacity(route.vehicle_capacity)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {user ? <LogoutButton /> : null}
              <Shield className="h-4 w-4 text-emerald-500" />
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
                        {formatRouteStopTime(stop.estimated_morning_time) || 'AM time pending'}
                        {' - '}
                        {formatRouteStopTime(stop.estimated_return_time) || 'PM time pending'}
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
            <h2 className="mb-3 text-base font-bold text-slate-900">Route notes</h2>
            <div className="grid gap-2 text-sm text-slate-600">
              <div>Passengers choose any pickup and drop-off stop in order.</div>
              <div>Phone numbers stay hidden until both sides accept.</div>
              <div>Weekly reservations are the default booking flow.</div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {isMemberUser && membershipActive ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Seat occupancy</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Approved requests reserve seats immediately with a seat number.
                  </p>
                </div>
                <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {activeSeatRequests.length} / {passengerSeatCapacity || 0} reserved
                </div>
              </div>

              {passengerSeatCapacity > 0 ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: passengerSeatCapacity }, (_, index) => index + 1).map((seatNumber) => {
                      const request = seatRequestsByNumber.get(seatNumber);
                      const passengerInactive = request?.status === 'suspended' || request?.passenger_membership_status !== 'active';
                      return (
                        <div key={seatNumber} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Seat {seatNumber}</div>
                              <div className="text-[11px] text-slate-500">Avatar only while occupied</div>
                            </div>
                            {request ? (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${passengerInactive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {passengerInactive ? 'Blocked' : formatSeatRequestStatusLabel(request.status)}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                Open
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            {request ? (
                              <SeatAvatar
                                avatarUrl={request.passenger_avatar_url}
                                label={`S${seatNumber}`}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-[11px] font-semibold text-slate-400">
                                {seatNumber}
                              </div>
                            )}
                            <div className="text-xs text-slate-500">
                              {request ? (passengerInactive ? 'Seat blocked for inactive passenger' : 'Seat occupied') : 'Seat available'}
                              {request?.seat_number ? (
                                <div className="mt-1 text-[11px] font-semibold text-slate-400">
                                  Assigned seat #{request.seat_number}
                                </div>
                              ) : request ? (
                                <div className="mt-1 text-[11px] font-semibold text-slate-400">
                                  Seat reserved during approval
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Seat capacity is not available for this route yet.
                </div>
              )}
            </section>
          ) : null}

          {currentSeatRequest ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Your seat request</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {currentSeatRequest.status === 'pending'
                      ? 'Your request is waiting for driver review.'
                      : currentSeatRequest.status === 'approved' || currentSeatRequest.status === 'assigned'
                        ? 'Your seat has been reserved.'
                        : currentSeatRequest.status === 'cancellation_requested'
                          ? 'Your cancellation request is waiting for driver review.'
                          : currentSeatRequest.status === 'suspended'
                            ? 'Your seat is blocked while your account is inactive.'
                            : 'This request is no longer active.'}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {formatSeatRequestStatusLabel(currentSeatRequest.status)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <div>
                  Pickup: {formatRouteStopLabel(stopById.get(currentSeatRequest.pickup_stop_id)?.stop_name, 'Pickup pending')}
                </div>
                <div>
                  Drop-off: {formatRouteStopLabel(stopById.get(currentSeatRequest.dropoff_stop_id)?.stop_name, 'Drop-off pending')}
                </div>
                <div>Requested days: {(currentSeatRequest.requested_days || []).join(', ') || 'Not set'}</div>
                <div>Request type: {currentSeatRequest.request_type}</div>
                <div>Seats requested: {currentSeatRequest.seats_requested ?? 1}</div>
                {currentSeatRequest.seat_number ? <div>Seat number: {currentSeatRequest.seat_number}</div> : <div>Seat will be assigned during approval.</div>}
              </div>

              {currentSeatRequest.status === 'approved' || currentSeatRequest.status === 'assigned' ? (
                <form action={requestSeatCancellationAction} className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <input type="hidden" name="routeId" value={route.id} />
                  <input type="hidden" name="requestId" value={currentSeatRequest.id} />
                  <p className="text-sm font-semibold text-amber-900">Need to cancel this seat?</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Your driver will review the cancellation before the seat becomes available again.
                  </p>
                  <button
                    type="submit"
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Request cancellation
                  </button>
                </form>
              ) : currentSeatRequest.status === 'cancellation_requested' ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Cancellation request submitted. Awaiting driver review.
                </div>
              ) : null}
            </section>
          ) : (
            <RouteSeatRequestForm
              routeId={route.id}
              stops={stops}
              canRequestSeat={canRequestSeat}
              isLoggedIn={isLoggedIn}
              membershipStatus={membershipActive ? 'active' : profile?.membership_status || latestPayment?.status || null}
            />
          )}

          {openRouteChatView ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-base font-bold text-slate-900">Route chat</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {openRouteChatView.is_joined
                      ? 'Chat with other joined members on this route.'
                      : 'Join the chat to read and send route messages.'}
                  </p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {openRouteChatView.participants.length} joined
                </div>
              </div>

              {!openRouteChatView.is_joined && openRouteChatView.can_join ? (
                <form action={joinOpenRouteChatFromForm} className="mb-3">
                  <input type="hidden" name="routeId" value={route.id} />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Join chat
                  </button>
                </form>
              ) : null}

              {openRouteChatView.is_joined ? (
                <>
                  <RouteChatThread
                    threadId={openRouteChatView.thread_id || route.id}
                    currentProfileId={profile?.id || ''}
                    participants={openRouteChatView.participants}
                    initialMessages={openRouteChatView.messages}
                    emptyStateText="No messages yet. Start the conversation with other members on this route."
                  />

                  <form id="private-offer" action={sendOpenRouteChatMessageFromForm} className="mt-3 space-y-2">
                    <input type="hidden" name="routeId" value={route.id} />
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label htmlFor="routeChatMessage" className="block text-sm font-semibold text-slate-900">
                        Message to route chat
                      </label>
                      <a
                        href="#private-offer"
                        className="inline-flex items-center justify-center rounded-lg border border-violet-500 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        Make an offer
                      </a>
                    </div>
                    <textarea
                      id="routeChatMessage"
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
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Only active members can join this chat.
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
