import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, MessageSquare, Route as RouteIcon, Send, Shield } from 'lucide-react';
import { getRouteDetail } from '@/lib/routes/actions';
import { formatVehicleCapacity } from '@/lib/types/pilot-routes';
import { createClient } from '@/lib/supabase/server';
import RouteChatThread from '@/components/RouteChatThread';
import DriverRouteApplicationForm from '@/components/DriverRouteApplicationForm';
import RouteSeatRequestForm from './RouteSeatRequestForm';
import { joinOpenRouteChatFromForm, getOpenRouteChatView, sendOpenRouteChatMessageFromForm } from '@/lib/routes/open-chat';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatRouteStopTime(value?: string | null) {
  if (!value) return null;
  const [hours = '', minutes = ''] = value.split(':');
  if (!hours || !minutes) return value;
  const hourNumber = Number(hours);
  const suffix = hourNumber >= 12 ? 'pm' : 'am';
  return `${hours.padStart(2, '0')}:${minutes} ${suffix}`;
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
        .select('id, role, membership_status, first_name, surname')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };
  const { data: driverProfile } = user
    ? await supabase
        .from('driver_profiles')
        .select('id, user_id, verification_status, id_status, vehicle_status')
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
  const membershipActive = profile?.membership_status === 'active' || latestPayment?.status === 'approved';
  const isMemberUser = profile?.role === 'member' || latestPayment?.status === 'approved';
  const isDriverUser = Boolean(profile?.role === 'driver' || driverProfile);
  const canRequestSeat = Boolean(isLoggedIn && isMemberUser && membershipActive);
  const { data: driverVehicles } = user && driverProfile
    ? await supabase
        .from('vehicles')
        .select('id, make, model, licence_plate, seat_capacity, verification_status, is_active')
        .eq('driver_id', driverProfile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    : { data: [] };
  const { data: driverApplication } = user && isDriverUser && profile?.id
    ? await supabase
        .from('driver_route_assignments')
        .select('id, route_id, vehicle_id, status, created_at')
        .eq('route_id', route.id)
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

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
                        {' · '}
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
          {isDriverUser ? (
            <DriverRouteApplicationForm
              routeId={route.id}
              routeVehicleCapacity={route.vehicle_capacity}
              driverVerified={Boolean(
                driverProfile?.id_status === 'approved' &&
                  driverProfile?.vehicle_status === 'approved'
              )}
              vehicles={(driverVehicles || []).map((vehicle) => ({
                id: vehicle.id,
                make: vehicle.make,
                model: vehicle.model,
                licence_plate: vehicle.licence_plate,
                seat_capacity: vehicle.seat_capacity,
              }))}
              existingApplication={(driverApplication || null) as
                | { id: string; status: string; vehicle_id: string; created_at: string }
                | null}
            />
          ) : null}

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

                  <form action={sendOpenRouteChatMessageFromForm} className="mt-3 space-y-2">
                    <input type="hidden" name="routeId" value={route.id} />
                    <label htmlFor="routeChatMessage" className="block text-sm font-semibold text-slate-900">
                      Message to route chat
                    </label>
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
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Only active members can join this chat.
                </div>
              )}
            </section>
          ) : null}

          {!isDriverUser ? (
            <RouteSeatRequestForm
              routeId={route.id}
              stops={stops}
              canRequestSeat={canRequestSeat}
              isLoggedIn={isLoggedIn}
              membershipStatus={membershipActive ? 'active' : profile?.membership_status || latestPayment?.status || null}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}



