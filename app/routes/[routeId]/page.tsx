import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, MessageSquare, Route as RouteIcon, Send, Shield } from 'lucide-react';
import { getRouteDetail, sendRouteChatMessageFromForm } from '@/lib/routes/actions';
import { createClient } from '@/lib/supabase/server';
import RouteChatThread, { type RouteChatMessage } from '@/components/RouteChatThread';
import RouteSeatRequestForm from './RouteSeatRequestForm';

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

  const { route, stops, assignments } = detail;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('id, role, membership_status, first_name, surname')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };
  const canRequestSeat = profile?.role === 'member' && profile.membership_status === 'active';
  const primaryAssignment = assignments.find((assignment) => ['approved', 'active'].includes(assignment.status)) || assignments[0] || null;
  const canUseRouteChat = Boolean(
    canRequestSeat &&
      primaryAssignment &&
      (Number(primaryAssignment.seats_available || 0) > 0)
  );
  const chatSinceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: routeChatMessages } = primaryAssignment && profile?.id
    ? await supabase
        .from('route_chats')
        .select('id, route_id, assignment_id, sender_id, receiver_id, message, created_at')
        .eq('route_id', route.id)
        .eq('assignment_id', primaryAssignment.id)
        .gte('created_at', chatSinceIso)
        .order('created_at', { ascending: true })
    : { data: [] };
  const chatDriverName = primaryAssignment?.driver_name || 'Assigned driver';
  const chatVehicleLabel = primaryAssignment?.vehicle_plate
    ? `Vehicle plate ${primaryAssignment.vehicle_plate}`
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
            </div>
            <Shield className="h-4 w-4 text-emerald-500" />
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
          {canUseRouteChat && primaryAssignment ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-base font-bold text-slate-900">Direct chat</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Chat with {chatDriverName} before requesting your seat.
                  </p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Seats available
                </div>
              </div>

              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {chatDriverName}
                {chatVehicleLabel ? ` - ${chatVehicleLabel}` : ''}
              </div>

              <RouteChatThread
                key={`${route.id}:${primaryAssignment.id}:${(routeChatMessages || []).length}`}
                routeId={route.id}
                assignmentId={primaryAssignment.id}
                currentProfileId={profile?.id || ''}
                peerProfileId={primaryAssignment.driver_id}
                initialMessages={(routeChatMessages || []) as RouteChatMessage[]}
                emptyStateText="No messages yet. Start the conversation before you request a seat."
              />

              <form action={sendRouteChatMessageFromForm} className="mt-3 space-y-2">
                <input type="hidden" name="routeId" value={route.id} />
                <input type="hidden" name="assignmentId" value={primaryAssignment.id} />
                <input type="hidden" name="receiverId" value={primaryAssignment.driver_id} />
                <label htmlFor="routeChatMessage" className="block text-sm font-semibold text-slate-900">
                  Message to driver
                </label>
                <textarea
                  id="routeChatMessage"
                  name="message"
                  rows={3}
                  placeholder={`Message ${chatDriverName}...`}
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
            </section>
          ) : null}

          <RouteSeatRequestForm routeId={route.id} stops={stops} canRequestSeat={canRequestSeat} />
        </div>
      </div>
    </div>
  );
}
