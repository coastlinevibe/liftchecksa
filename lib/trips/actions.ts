'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

export async function createTrip(formData: {
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

  // Get driver profile
  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, verification_status')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    return { error: 'Driver profile not found' };
  }

  if (driverProfile.verification_status !== 'approved') {
    return { error: 'Driver verification pending or rejected' };
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, verification_status, is_active')
    .eq('id', formData.vehicleId)
    .eq('driver_id', driverProfile.id)
    .eq('is_active', true)
    .single();

  if (vehicleError || !vehicle) {
    return { error: 'Select a registered vehicle before creating a trip' };
  }

  if (vehicle.verification_status !== 'approved') {
    return { error: 'Your vehicle must be approved before you can create a trip' };
  }

  // Generate public slug
  const slug = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create trip
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      driver_id: driverProfile.id,
      vehicle_id: formData.vehicleId,
      origin: formData.origin,
      destination: formData.destination,
      route_corridor: formData.routeCorridor,
      departure_date: formData.departureDate,
      departure_time: formData.departureTime,
      seats_total: formData.seatsTotal,
      seats_available: formData.seatsTotal,
      cost_share_amount: formData.costShareAmount,
      luggage_rules: formData.luggageRules,
      pickup_points: formData.pickupPoints,
      dropoff_points: formData.dropoffPoints,
      notes: formData.notes,
      passenger_rules: formData.passengerRules,
      status: 'published',
      public_slug: slug,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/driver');
  revalidatePath('/trips');

  return { success: true, trip };
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

export async function getAvailableTrips() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { error: 'Missing Supabase configuration' };
  }

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
    return {
      trips: (tripCards as PublishedTripCard[]).map((trip) => ({
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
      })),
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

  return {
    trips: trips.map((trip) => {
      const driverProfile = driverProfilesById.get(trip.driver_id);

      return {
        ...trip,
        driver_profiles: driverProfile || null,
        profiles: driverProfile ? profilesByUserId.get(driverProfile.user_id) || null : null,
        vehicles: trip.vehicle_id ? vehiclesById.get(trip.vehicle_id) || null : null,
      };
    }),
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

  return {
    trip: {
      ...publishedTrip,
      ...trip,
      driver_profiles: driverProfiles,
      profiles: profile,
      vehicles: vehicle,
    },
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

  const { data: request, error } = await supabase
    .from('trip_requests')
    .insert({
      trip_id: tripId,
      passenger_id: profile.id,
      seats_requested: seatsRequested,
      message,
      pickup_point: pickupPoint,
      dropoff_point: dropoffPoint,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already requested this trip' };
    }
    return { error: error.message };
  }

  revalidatePath(`/trips/${tripId}`);

  return { success: true, request };
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
