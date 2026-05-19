import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Car, Clock, MapPin, MessageSquare, Send, Shield, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTripById, requestTripSeat } from '@/lib/trips/actions';

type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at?: string | null;
};

export default async function BookSeatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ booking_error?: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/trips/${id}/book`)}`);
  }

  const { trip } = await getTripById(id);

  if (!trip) {
    notFound();
  }

  const driverName = `${trip.profiles?.first_name || 'Verified'} ${trip.profiles?.surname || ''}`.trim();
  const vehicleLabel = trip.vehicles
    ? `${trip.vehicles.make} ${trip.vehicles.model}${trip.vehicles.year ? ` ${trip.vehicles.year}` : ''}`.trim()
    : 'Vehicle not listed';
  const defaultPickupPoint = trip.pickup_points?.[0] || trip.origin;
  const defaultDropoffPoint = trip.dropoff_points?.[0] || trip.destination;
  const { data: memberProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const chatMessages = (
    await supabase
      .from('trip_chats')
      .select('id, sender_id, receiver_id, message, created_at')
      .eq('trip_id', id)
      .order('created_at', { ascending: true })
  ).data as ChatMessage[] | null;

  async function bookSeatAction(formData: FormData) {
    'use server';

    const seatCount = Number(formData.get('seatCount') || 1);
    if (![1, 2].includes(seatCount)) {
      redirect(`/trips/${id}/book?booking_error=Choose 1 or 2 seats.`);
    }

    const result = await requestTripSeat(id, undefined, defaultPickupPoint, defaultDropoffPoint, seatCount);

    if ('error' in result) {
      const bookingError = result.error || 'Booking request failed.';
      redirect(`/trips/${id}?booking_error=${encodeURIComponent(bookingError)}`);
    }

    redirect(`/trips/${id}?booked=1`);
  }

  async function sendChatMessageAction(formData: FormData) {
    'use server';

    const message = String(formData.get('message') || '').trim();
    if (!message) {
      redirect(`/trips/${id}/book`);
    }

    const actionSupabase = await createClient();
    const { error } = await actionSupabase.rpc('send_trip_chat_message', {
      p_trip_id: id,
      p_message: message,
    });

    if (error) {
      redirect(`/trips/${id}/book?booking_error=${encodeURIComponent(error.message)}`);
    }

    redirect(`/trips/${id}/book`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href={`/trips/${id}`} className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to trip
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Book a seat</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        {resolvedSearchParams?.booking_error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <div className="text-sm font-semibold text-rose-900">Could not send request</div>
            <p className="mt-1 text-xs text-rose-800">{resolvedSearchParams.booking_error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {trip.profiles?.profile_photo_url ? (
                <img
                  src={trip.profiles.profile_photo_url}
                  alt={`${driverName} profile photo`}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <Shield className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{driverName}</div>
              <div className="text-xs text-slate-600">{vehicleLabel}</div>
            </div>
          </div>

          {trip.vehicles?.vehicle_photo_url ? (
            <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img
                src={trip.vehicles.vehicle_photo_url}
                alt={`${vehicleLabel} vehicle photo`}
                className="h-40 w-full object-cover object-center"
              />
            </div>
          ) : (
            <div className="mb-4 flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Car className="h-8 w-8 text-slate-400" />
            </div>
          )}

          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Route</div>
                <div className="font-semibold text-slate-900">
                  {trip.origin} to {trip.destination}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <div className="font-semibold text-slate-900">{trip.departure_date}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Time</div>
                <div className="font-semibold text-slate-900">{trip.departure_time}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <Users className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Seats left</div>
                <div className="font-semibold text-slate-900">{trip.seats_available} of {trip.seats_total}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-900">Chat before booking</div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {chatMessages && chatMessages.length > 0 ? (
              chatMessages.map((chat) => {
                const isMine = chat.sender_id === memberProfile?.id;
                return (
                  <div key={chat.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        isMine
                          ? 'bg-emerald-500 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-900 rounded-bl-md'
                      }`}
                    >
                      {chat.message}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                Ask the driver anything you need to agree on before booking.
              </div>
            )}
          </div>

          <form action={sendChatMessageAction} className="space-y-2">
            <label htmlFor="chatMessage" className="block text-sm font-semibold text-slate-900">
              Message to driver
            </label>
            <textarea
              id="chatMessage"
              name="message"
              rows={3}
              placeholder={`Message ${trip.profiles?.first_name || 'driver'}...`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-white px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
            >
              <Send className="w-4 h-4" />
              Send message
            </button>
          </form>
        </div>

        <form action={bookSeatAction} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500 mb-1">Pickup point</div>
            <div className="text-sm font-semibold text-slate-900">{defaultPickupPoint}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500 mb-1">Drop-off point</div>
            <div className="text-sm font-semibold text-slate-900">{defaultDropoffPoint}</div>
          </div>

          <div>
            <div className="block text-sm font-semibold text-slate-900 mb-2">
              Seats to book
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((seatCount) => (
                <label
                  key={seatCount}
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700"
                >
                  <input
                    type="radio"
                    name="seatCount"
                    value={seatCount}
                    defaultChecked={seatCount === 1}
                    className="sr-only"
                  />
                  {seatCount} seat{seatCount > 1 ? 's' : ''}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Agree the details in chat first, then choose the number of seats here.
            </p>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <MessageSquare className="w-4 h-4" />
            Confirm booking request
          </button>
        </form>
      </div>
    </div>
  );
}
