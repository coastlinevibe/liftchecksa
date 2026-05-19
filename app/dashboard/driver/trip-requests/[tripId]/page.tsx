import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ArrowLeft, Calendar, CheckCircle, Clock, MapPin, Save, Send, Shield, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

type TripRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

type TripRequest = {
  id: string;
  passenger_id: string;
  status: TripRequestStatus;
  seats_requested?: number | null;
  message?: string | null;
  pickup_point?: string | null;
  dropoff_point?: string | null;
  requested_at?: string | null;
};

type PassengerProfile = {
  id: string;
  first_name?: string | null;
  surname?: string | null;
  zii_status?: string | null;
};

type ChatMessage = {
  id: string;
  trip_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at?: string | null;
};

type ChatConversation = {
  participantId: string;
  passenger?: PassengerProfile;
  messages: ChatMessage[];
  agreementNotes?: string | null;
};

type DriverTrip = {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time?: string | null;
  seats_total: number;
  seats_available: number;
  cost_share_amount: number | string;
};

type AgreementNote = {
  passenger_id: string;
  notes?: string | null;
};

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString || 'TBA';

  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatTime(timeString?: string | null) {
  return timeString ? timeString.slice(0, 5) : 'TBA';
}

function formatRequestedAt(value?: string | null) {
  if (!value) return 'Request received';

  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function sendDriverChatMessage(formData: FormData) {
  'use server';

  const tripId = String(formData.get('tripId') || '');
  const receiverId = String(formData.get('receiverId') || '');
  const message = String(formData.get('message') || '').trim();

  if (!tripId || !receiverId || !message) {
    redirect(`/dashboard/driver/trip-requests/${tripId || ''}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    redirect('/dashboard/driver');
  }

  const { data: driverMemberProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('driver_id', driverProfile.id)
    .single();

  if (!driverMemberProfile || !trip) {
    redirect('/dashboard/driver');
  }

  const [{ data: existingChat }, { data: existingRequest }] = await Promise.all([
    supabase
      .from('trip_chats')
      .select('id')
      .eq('trip_id', tripId)
      .or(`sender_id.eq.${receiverId},receiver_id.eq.${receiverId}`)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trip_requests')
      .select('id')
      .eq('trip_id', tripId)
      .eq('passenger_id', receiverId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!existingChat && !existingRequest) {
    redirect(`/dashboard/driver/trip-requests/${tripId}`);
  }

  await supabase.from('trip_chats').insert({
    trip_id: tripId,
    sender_id: driverMemberProfile.id,
    receiver_id: receiverId,
    message,
  });

  revalidatePath(`/dashboard/driver/trip-requests/${tripId}`);
  redirect(`/dashboard/driver/trip-requests/${tripId}`);
}

async function saveAgreementNotes(formData: FormData) {
  'use server';

  const tripId = String(formData.get('tripId') || '');
  const passengerId = String(formData.get('passengerId') || '');
  const notes = String(formData.get('notes') || '').trim();

  if (!tripId || !passengerId) {
    redirect(`/dashboard/driver/trip-requests/${tripId || ''}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: driverProfile }, { data: driverMemberProfile }] = await Promise.all([
    supabase
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single(),
  ]);

  if (!driverProfile || !driverMemberProfile) {
    redirect('/dashboard/driver');
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('driver_id', driverProfile.id)
    .single();

  if (!trip) {
    redirect('/dashboard/driver');
  }

  const [{ data: existingChat }, { data: existingRequest }] = await Promise.all([
    supabase
      .from('trip_chats')
      .select('id')
      .eq('trip_id', tripId)
      .or(`sender_id.eq.${passengerId},receiver_id.eq.${passengerId}`)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trip_requests')
      .select('id')
      .eq('trip_id', tripId)
      .eq('passenger_id', passengerId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!existingChat && !existingRequest) {
    redirect(`/dashboard/driver/trip-requests/${tripId}`);
  }

  await supabase.from('trip_agreements').upsert(
    {
      trip_id: tripId,
      passenger_id: passengerId,
      notes,
      updated_by: driverMemberProfile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'trip_id,passenger_id' }
  );

  revalidatePath(`/dashboard/driver/trip-requests/${tripId}`);
  redirect(`/dashboard/driver/trip-requests/${tripId}`);
}

async function getDriverTripRequests(tripId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    redirect('/dashboard/driver');
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, origin, destination, departure_date, departure_time, seats_total, seats_available, cost_share_amount')
    .eq('id', tripId)
    .eq('driver_id', driverProfile.id)
    .single();

  if (!trip) {
    redirect('/dashboard/driver');
  }

  const { data: requests } = await supabase
    .from('trip_requests')
    .select('id, passenger_id, status, seats_requested, message, pickup_point, dropoff_point, requested_at')
    .eq('trip_id', tripId)
    .order('requested_at', { ascending: false });

  const { data: driverMemberProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data: chatMessages } = await supabase
    .from('trip_chats')
    .select('id, trip_id, sender_id, receiver_id, message, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const { data: agreementNotes } = await supabase
    .from('trip_agreements')
    .select('passenger_id, notes')
    .eq('trip_id', tripId);

  const chatParticipantIds = (chatMessages || [])
    .flatMap((message) => [message.sender_id, message.receiver_id])
    .filter((profileId) => profileId && profileId !== driverMemberProfile?.id);
  const passengerIds = [
    ...new Set([
      ...(requests || []).map((request) => request.passenger_id).filter(Boolean),
      ...chatParticipantIds,
    ]),
  ];
  const { data: passengers } = passengerIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname, zii_status')
        .in('id', passengerIds)
    : { data: [] };

  const passengersById = new Map((passengers || []).map((passenger) => [passenger.id, passenger]));
  const agreementNotesByPassengerId = new Map(
    ((agreementNotes || []) as AgreementNote[]).map((agreement) => [agreement.passenger_id, agreement.notes || ''])
  );

  return {
    trip: trip as DriverTrip,
    requests: (requests || []) as TripRequest[],
    chatMessages: (chatMessages || []) as ChatMessage[],
    driverProfileId: driverMemberProfile?.id || '',
    passengersById,
    agreementNotesByPassengerId,
  };
}

export default async function TripRequestsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const { trip, requests, chatMessages, driverProfileId, passengersById, agreementNotesByPassengerId } = await getDriverTripRequests(tripId);
  const confirmedBookings = requests.filter((request) => request.status === 'accepted');
  const seatsBooked = Math.max((trip.seats_total || 0) - (trip.seats_available || 0), 0);
  const conversationsByPassenger = new Map<string, ChatMessage[]>();

  for (const message of chatMessages) {
    const participantId = message.sender_id === driverProfileId ? message.receiver_id : message.sender_id;
    if (!participantId || participantId === driverProfileId) continue;

    conversationsByPassenger.set(participantId, [
      ...(conversationsByPassenger.get(participantId) || []),
      message,
    ]);
  }

  const conversations: ChatConversation[] = Array.from(conversationsByPassenger.entries()).map(
    ([participantId, messages]) => ({
      participantId,
      passenger: passengersById.get(participantId),
      messages,
      agreementNotes: agreementNotesByPassengerId.get(participantId) || '',
    })
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/driver" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Trip Requests</h1>
          <p className="text-xs text-slate-600">
            {trip.origin} to {trip.destination} - {formatDate(trip.departure_date)}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 mb-1">Seats Status</div>
              <div className="text-xs text-slate-600">
                {seatsBooked} of {trip.seats_total} seats booked
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-600">R{trip.cost_share_amount}</div>
              <div className="text-xs text-slate-500">per seat</div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{trip.origin} to {trip.destination}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(trip.departure_date)} - {formatTime(trip.departure_time)}</span>
            </div>
          </div>
        </div>

        <ChatSection
          conversations={conversations}
          driverProfileId={driverProfileId}
          tripId={trip.id}
        />

        <RequestSection
          title={`Confirmed Bookings (${confirmedBookings.length})`}
          emptyText="Passenger bookings will appear here after they confirm seats."
          requests={confirmedBookings}
          passengersById={passengersById}
        />
      </div>
    </div>
  );
}

function ChatSection({
  conversations,
  driverProfileId,
  tripId,
}: {
  conversations: ChatConversation[];
  driverProfileId: string;
  tripId: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">
        Interested Chats ({conversations.length})
      </h2>
      {conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <ChatCard
              key={conversation.participantId}
              conversation={conversation}
              driverProfileId={driverProfileId}
              tripId={tripId}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
          Passenger chats for this trip will appear here before they book.
        </div>
      )}
    </div>
  );
}

function ChatCard({
  conversation,
  driverProfileId,
  tripId,
}: {
  conversation: ChatConversation;
  driverProfileId: string;
  tripId: string;
}) {
  const passengerName = conversation.passenger
    ? `${conversation.passenger.first_name || 'Passenger'} ${conversation.passenger.surname || ''}`.trim()
    : 'Passenger';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {passengerName[0]?.toUpperCase() || 'P'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900 truncate">{passengerName}</span>
            {conversation.passenger?.zii_status === 'active' ? (
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
            ) : null}
          </div>
          <div className="text-xs text-slate-500">Pre-booking conversation</div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
        {conversation.messages.map((message) => {
          const isMine = message.sender_id === driverProfileId;
          return (
            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? 'bg-emerald-500 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-900 rounded-bl-md'
                }`}
              >
                {message.message}
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendDriverChatMessage} className="space-y-2">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="receiverId" value={conversation.participantId} />
        <textarea
          name="message"
          rows={2}
          placeholder={`Reply to ${passengerName}...`}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50">
          <Send className="w-4 h-4" />
          Send reply
        </button>
      </form>

      <form action={saveAgreementNotes} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="passengerId" value={conversation.participantId} />
        <label className="block text-sm font-semibold text-slate-900">
          Agreement notes
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={conversation.agreementNotes || ''}
          placeholder="Add any agreed changes for this passenger..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
          <Save className="w-4 h-4" />
          Save agreement notes
        </button>
      </form>
    </div>
  );
}

function RequestSection({
  title,
  emptyText,
  requests,
  passengersById,
}: {
  title: string;
  emptyText: string;
  requests: TripRequest[];
  passengersById: Map<string, PassengerProfile>;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">{title}</h2>
      {requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              passenger={passengersById.get(request.passenger_id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  passenger,
}: {
  request: TripRequest;
  passenger?: PassengerProfile;
}) {
  const passengerName = passenger
    ? `${passenger.first_name || 'Passenger'} ${passenger.surname || ''}`.trim()
    : 'Passenger';

  return (
    <div
      className={`bg-white rounded-xl border-2 p-4 ${
        request.status === 'accepted'
          ? 'border-emerald-300 bg-emerald-50/30'
          : request.status === 'rejected'
            ? 'border-red-300 bg-red-50/30 opacity-75'
            : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold">
          {passengerName[0]?.toUpperCase() || 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-bold text-slate-900 truncate">{passengerName}</span>
            {passenger?.zii_status === 'active' ? <Shield className="w-3.5 h-3.5 text-emerald-500" /> : null}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{request.seats_requested || 1} seat{(request.seats_requested || 1) === 1 ? '' : 's'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatRequestedAt(request.requested_at)}</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="w-3 h-3" />
              <span>Booked</span>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-600">
            {request.pickup_point ? <div><strong>Pickup:</strong> {request.pickup_point}</div> : null}
            {request.dropoff_point ? <div><strong>Drop-off:</strong> {request.dropoff_point}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
