'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SUPABASE_KEY, DEFAULT_SUPABASE_URL } from '@/lib/supabase/config';
import { resolveTripMediaUrls, resolveTripsMediaUrls } from '@/lib/supabase/storage';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type PublishedTripCard = {
  id?: string;
  driver_first_name?: string | null;
  driver_surname?: string | null;
  driver_profile_photo_url?: string | null;
  driver_rating_average?: number | string | null;
  driver_rating_count?: number | null;
  driver_completed_trips?: number | null;
  driver_verification_status?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_colour?: string | null;
  vehicle_licence_plate?: string | null;
  vehicle_photo_url?: string | null;
  vehicle_verification_status?: string | null;
};

export async function createTrip(_formData: {
  vehicleId: string;
  origin: string;
  destination: string;
  routeCorridor?: string;
  departureDate: string;
  departureTime: string;
  seatsTotal: number;
  costShareAmount: number;
  luggageRules?: string;
  pickupPoints?: string[];
  dropoffPoints?: string[];
  notes?: string;
  passengerRules?: string;
}) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  return { error: 'Drivers do not publish open trips. Admins create official routes and assign approved drivers.' };
}

export async function getDriverTrips() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    return { error: 'Driver profile not found' };
  }

  const { data: trips, error } = await supabase
    .from('trips')
    .select(`
      *,
      vehicles (
        make,
        model,
        colour,
        licence_plate
      )
    `)
    .eq('driver_id', driverProfile.id)
    .order('departure_date', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { trips };
}

export async function getDriverTripById(tripId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, user_id, completed_trips, rating_average, rating_count, verification_status')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    redirect('/dashboard/driver');
  }

  const [{ data: trip, error: tripError }, { data: vehicles }] = await Promise.all([
    supabase
      .from('trips')
      .select(`
        *,
        vehicles (
          id,
          make,
          model,
          colour,
          licence_plate,
          year,
          vehicle_photo_url,
          verification_status,
          is_active
        )
      `)
      .eq('id', tripId)
      .eq('driver_id', driverProfile.id)
      .single(),
    supabase
      .from('vehicles')
      .select('id, make, model, colour, licence_plate, year, vehicle_photo_url, verification_status, is_active')
      .eq('driver_id', driverProfile.id)
      .order('created_at', { ascending: false }),
  ]);

  if (tripError || !trip) {
    redirect('/dashboard/driver');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, profile_photo_url')
    .eq('user_id', user.id)
    .single();

  return {
    profile,
    driverProfile,
    trip,
    vehicles: vehicles || [],
  };
}

export async function getAvailableTrips() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    DEFAULT_SUPABASE_KEY;

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: tripCards, error: tripCardsError } = await supabase
    .rpc('get_published_trip_cards');

  if (!tripCardsError && tripCards) {
    const trips = (tripCards as PublishedTripCard[]).map((trip) => ({
      ...trip,
      profiles: {
        first_name: trip.driver_first_name,
        surname: trip.driver_surname,
        profile_photo_url: trip.driver_profile_photo_url,
      },
      driver_profiles: {
        rating_average: trip.driver_rating_average,
        rating_count: trip.driver_rating_count,
        completed_trips: trip.driver_completed_trips,
        verification_status: trip.driver_verification_status,
      },
      vehicles: trip.vehicle_make
        ? {
            make: trip.vehicle_make,
            model: trip.vehicle_model,
            colour: trip.vehicle_colour,
            licence_plate: trip.vehicle_licence_plate,
            vehicle_photo_url: trip.vehicle_photo_url,
            verification_status: trip.vehicle_verification_status,
          }
        : null,
    }));

    return {
      trips: await resolveTripsMediaUrls(supabase, trips),
    };
  }

  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('status', 'published')
    .gt('seats_available', 0)
    .order('departure_date', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  if (!trips?.length) {
    return { trips: [] };
  }

  const driverIds = [...new Set(trips.map((trip) => trip.driver_id).filter(Boolean))];
  const vehicleIds = [...new Set(trips.map((trip) => trip.vehicle_id).filter(Boolean))];

  const [{ data: driverProfiles }, { data: vehicles }] = await Promise.all([
    driverIds.length
      ? supabase
          .from('driver_profiles')
          .select('id, user_id, rating_average, rating_count, completed_trips, verification_status')
          .in('id', driverIds)
      : Promise.resolve({ data: [] }),
    vehicleIds.length
      ? supabase
          .from('vehicles')
          .select('id, make, model, colour, licence_plate, verification_status')
          .in('id', vehicleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userIds = [...new Set((driverProfiles || []).map((profile) => profile.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await supabase
        .from('profiles')
        .select('user_id, first_name, surname, profile_photo_url')
        .in('user_id', userIds)
    : { data: [] };

  const driverProfilesById = new Map((driverProfiles || []).map((profile) => [profile.id, profile]));
  const profilesByUserId = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
  const vehiclesById = new Map((vehicles || []).map((vehicle) => [vehicle.id, vehicle]));

  const normalizedTrips = trips.map((trip) => {
    const driverProfile = driverProfilesById.get(trip.driver_id);

    return {
      ...trip,
      driver_profiles: driverProfile || null,
      profiles: driverProfile ? profilesByUserId.get(driverProfile.user_id) || null : null,
      vehicles: trip.vehicle_id ? vehiclesById.get(trip.vehicle_id) || null : null,
    };
  });

  return {
    trips: await resolveTripsMediaUrls(supabase, normalizedTrips),
  };
}

export async function getTripById(tripId: string) {
  const supabase = await createClient();

  const { trips = [] } = await getAvailableTrips();
  const publishedTrip = trips.find((item: { id?: string }) => item.id === tripId);

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error) {
    return { error: error.message };
  }

  const [{ data: driverProfile }, { data: directVehicle }] = await Promise.all([
    supabase
      .from('driver_profiles')
      .select(`
        id,
        user_id,
        rating_average,
        rating_count,
        completed_trips,
        verification_status,
        id_status,
        licence_status,
        vehicle_status
      `)
      .eq('id', trip.driver_id)
      .single(),
    trip.vehicle_id
      ? supabase
          .from('vehicles')
          .select('id, make, model, colour, licence_plate, year, vehicle_photo_url, verification_status')
          .eq('id', trip.vehicle_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: directProfile } = driverProfile?.user_id
    ? await supabase
        .from('profiles')
        .select('first_name, surname, profile_photo_url, phone')
        .eq('user_id', driverProfile.user_id)
        .maybeSingle()
    : { data: null };

  const driverProfiles = publishedTrip?.driver_profiles || driverProfile
    ? {
        ...(publishedTrip?.driver_profiles || {}),
        ...(driverProfile || {}),
      }
    : null;
  const profile = publishedTrip?.profiles || directProfile
    ? {
        ...(publishedTrip?.profiles || {}),
        ...(directProfile || {}),
      }
    : null;
  const vehicle = publishedTrip?.vehicles || directVehicle
    ? {
        ...(publishedTrip?.vehicles || {}),
        ...(directVehicle || {}),
      }
    : null;

  const tripWithRelations = {
      ...publishedTrip,
      ...trip,
      driver_profiles: driverProfiles,
      profiles: profile,
      vehicles: vehicle,
    };

  return {
    trip: await resolveTripMediaUrls(supabase, tripWithRelations),
  };
}

export async function requestTripSeat(
  tripId: string,
  message?: string,
  pickupPoint?: string,
  dropoffPoint?: string,
  seatsRequested = 1
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, membership_status')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return { error: 'Profile not found' };
  }

  if (profile.membership_status !== 'active') {
    return { error: 'Active membership required' };
  }

  const { data: request, error } = await supabase.rpc('reserve_trip_seat', {
    p_trip_id: tripId,
    p_message: message || null,
    p_pickup_point: pickupPoint || null,
    p_dropoff_point: dropoffPoint || null,
    p_seats_requested: seatsRequested,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath('/dashboard/driver');
  revalidatePath(`/dashboard/driver/trip-requests/${tripId}`);
  revalidatePath(`/dashboard/driver/trips/${tripId}`);

  return { success: true, request };
}

function parseListValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return undefined;

  const items = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

export async function updateDriverTrip(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const tripId = formData.get('tripId');
  if (typeof tripId !== 'string' || !tripId) {
    redirect('/dashboard/driver?trip_error=Missing%20trip%20ID');
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    redirect('/dashboard/driver');
  }

  const { data: currentTrip, error: currentTripError } = await supabase
    .from('trips')
    .select('id, seats_total, seats_available')
    .eq('id', tripId)
    .eq('driver_id', driverProfile.id)
    .single();

  if (currentTripError || !currentTrip) {
    redirect('/dashboard/driver');
  }

  const origin = String(formData.get('origin') || '').trim();
  const destination = String(formData.get('destination') || '').trim();
  const departureDate = String(formData.get('departureDate') || '').trim();
  const departureTime = String(formData.get('departureTime') || '').trim();
  const costShareAmount = Number(String(formData.get('costShareAmount') || '').trim());
  const seatsTotal = Number(String(formData.get('seatsTotal') || '').trim());
  const vehicleId = String(formData.get('vehicleId') || '').trim();
  const routeCorridor = String(formData.get('routeCorridor') || '').trim() || null;
  const luggageRules = String(formData.get('luggageRules') || '').trim() || null;
  const notes = String(formData.get('notes') || '').trim() || null;
  const passengerRules = String(formData.get('passengerRules') || '').trim() || null;
  const status = String(formData.get('status') || '').trim();
  const pickupPoints = parseListValue(formData.get('pickupPoints'));
  const dropoffPoints = parseListValue(formData.get('dropoffPoints'));

  if (!origin || !destination || !departureDate || !departureTime || !vehicleId || !Number.isFinite(costShareAmount) || !Number.isInteger(seatsTotal)) {
    redirect(`/dashboard/driver/trips/${tripId}?update_error=${encodeURIComponent('Please complete all required fields.')}`);
  }

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, verification_status, is_active')
    .eq('id', vehicleId)
    .eq('driver_id', driverProfile.id)
    .single();

  if (!vehicle || vehicle.is_active === false || vehicle.verification_status !== 'approved') {
    redirect(`/dashboard/driver/trips/${tripId}?update_error=${encodeURIComponent('Select an approved active vehicle.')}`);
  }

  const bookedSeats = Math.max((currentTrip.seats_total || 0) - (currentTrip.seats_available || 0), 0);
  if (seatsTotal < bookedSeats) {
    redirect(`/dashboard/driver/trips/${tripId}?update_error=${encodeURIComponent('Seats cannot be lower than the number already booked.')}`);
  }

  const seatsAvailable = Math.max(seatsTotal - bookedSeats, 0);
  const allowedStatuses = new Set(['draft', 'published', 'full', 'completed', 'cancelled']);
  const nextStatus = allowedStatuses.has(status) ? status : 'published';

  const { error } = await supabase
    .from('trips')
    .update({
      origin,
      destination,
      route_corridor: routeCorridor,
      departure_date: departureDate,
      departure_time: departureTime,
      seats_total: seatsTotal,
      seats_available: seatsAvailable,
      cost_share_amount: costShareAmount,
      luggage_rules: luggageRules,
      pickup_points: pickupPoints,
      dropoff_points: dropoffPoints,
      notes,
      passenger_rules: passengerRules,
      status: nextStatus,
      vehicle_id: vehicleId,
    })
    .eq('id', tripId)
    .eq('driver_id', driverProfile.id);

  if (error) {
    redirect(`/dashboard/driver/trips/${tripId}?update_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/dashboard/driver');
  revalidatePath(`/dashboard/driver/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath('/trips');

  redirect(`/dashboard/driver/trips/${tripId}?updated=1`);
}

export async function getDriverVehicles() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    return { error: 'Driver profile not found' };
  }

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('driver_id', driverProfile.id)
    .eq('verification_status', 'approved')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { vehicles };
}
