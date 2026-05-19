import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Calendar, Car, CheckCircle, Clock, MapPin, MessageSquare, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTripById } from '@/lib/trips/actions';

function formatTripDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue || 'TBA';

  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatTripTime(timeValue?: string | null) {
  return timeValue ? timeValue.slice(0, 5) : 'TBA';
}

export default async function BookingConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ request?: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/trips/${id}/booking-confirmed`)}`);
  }

  const { trip } = await getTripById(id);
  if (!trip) {
    notFound();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    redirect('/trips');
  }

  const requestQuery = supabase
    .from('trip_requests')
    .select('id, seats_requested, pickup_point, dropoff_point, requested_at, accepted_at')
    .eq('trip_id', id)
    .eq('passenger_id', profile.id)
    .eq('status', 'accepted');

  const { data: booking } = resolvedSearchParams?.request
    ? await requestQuery.eq('id', resolvedSearchParams.request).maybeSingle()
    : await requestQuery.order('accepted_at', { ascending: false }).limit(1).maybeSingle();

  if (!booking) {
    redirect(`/trips/${id}/book`);
  }

  const { data: agreement } = await supabase
    .from('trip_agreements')
    .select('notes')
    .eq('trip_id', id)
    .eq('passenger_id', profile.id)
    .maybeSingle();

  const driverName = `${trip.profiles?.first_name || 'Verified'} ${trip.profiles?.surname || ''}`.trim();
  const vehicleLabel = trip.vehicles
    ? `${trip.vehicles.make} ${trip.vehicles.model}${trip.vehicles.year ? ` ${trip.vehicles.year}` : ''}`.trim()
    : 'Vehicle not listed';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href={`/trips/${id}`} className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to trip
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Booking confirmed</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            <div className="text-base font-bold">Your seat is booked</div>
          </div>
          <p className="mt-1 text-sm text-emerald-800">
            Keep this confirmation handy and complete Match Check before getting in.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center flex-shrink-0">
              {trip.profiles?.profile_photo_url ? (
                <img
                  src={trip.profiles.profile_photo_url}
                  alt={`${driverName} profile photo`}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <Car className="h-6 w-6 text-emerald-600" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{driverName}</div>
              <div className="text-xs text-slate-600">{vehicleLabel}</div>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Pickup</div>
                <div className="font-semibold text-slate-900">{booking.pickup_point || trip.origin}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Drop-off</div>
                <div className="font-semibold text-slate-900">{booking.dropoff_point || trip.destination}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500">Date</div>
                  <div className="font-semibold text-slate-900">{formatTripDate(trip.departure_date)}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500">Time</div>
                  <div className="font-semibold text-slate-900">{formatTripTime(trip.departure_time)}</div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <Users className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Seats booked</div>
                <div className="font-semibold text-slate-900">
                  {booking.seats_requested || 1} seat{(booking.seats_requested || 1) === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {agreement?.notes ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Agreed notes</h2>
            </div>
            <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">{agreement.notes}</p>
          </div>
        ) : null}

        <Link
          href={`/match-check/${id}`}
          className="block w-full rounded-lg bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Open Match Check
        </Link>
      </div>
    </div>
  );
}
