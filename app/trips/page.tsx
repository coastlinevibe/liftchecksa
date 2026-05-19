import Link from 'next/link';
import { Search, MapPin, Calendar, Users, Star, Shield, ChevronRight, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAvailableTrips } from '@/lib/trips/actions';

type SearchParams = {
  origin?: string | string[];
  destination?: string | string[];
};

type TripListItem = {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  seats_available: number;
  seats_total: number;
  cost_share_amount: number | string;
  pickup_points?: string[] | string | null;
  dropoff_points?: string[] | string | null;
  luggage_rules?: string | null;
  profiles?: {
    first_name?: string | null;
    surname?: string | null;
    profile_photo_url?: string | null;
  } | null;
  driver_profiles?: {
    rating_average?: number | string | null;
    rating_count?: number | null;
    completed_trips?: number | null;
  } | null;
  vehicles?: {
    make?: string | null;
    model?: string | null;
    colour?: string | null;
    licence_plate?: string | null;
  } | null;
};

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function formatTripDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue || 'TBA';
  }
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatTripTime(timeValue: string) {
  if (!timeValue) return 'TBA';
  return timeValue ? timeValue.slice(0, 5) : '';
}

function formatMoney(value: unknown) {
  if (typeof value === 'number') return value.toLocaleString('en-ZA');
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.');
    const amount = Number(normalized);
    if (Number.isFinite(amount)) return amount.toLocaleString('en-ZA');
  }
  return '0';
}

function formatList(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') {
    return value.replace(/^\{|\}$/g, '').split(',').filter(Boolean).join(', ');
  }
  return '';
}

function extractStoragePath(url: string, bucket: string) {
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
  if (publicMatch?.[1]) return publicMatch[1].replace(new RegExp(`^${bucket}\\/`), '');

  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
  if (signedMatch?.[1]) return signedMatch[1].replace(new RegExp(`^${bucket}\\/`), '');

  return '';
}

async function resolveSignedStorageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  url?: string | null
) {
  if (!url) return '';

  const path = extractStoragePath(url, bucket);
  if (!path) return url;

  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || url;
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const originQuery = firstValue(resolvedSearchParams?.origin).trim().toLowerCase();
  const destinationQuery = firstValue(resolvedSearchParams?.destination).trim().toLowerCase();

  let isAuthenticated = false;
  let allTrips: TripListItem[] = [];
  let loadError = '';
  const supabase = await createClient();

  try {
    const tripsResult = await getAvailableTrips();
    allTrips = (tripsResult as { trips?: TripListItem[]; error?: string }).trips || [];
    loadError = (tripsResult as { trips?: TripListItem[]; error?: string }).error || '';
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Trips are temporarily unavailable.';
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    isAuthenticated = false;
  }

  const resolvedTrips = await Promise.all(
    allTrips.map(async (trip) => ({
      ...trip,
      profiles: trip.profiles?.profile_photo_url
        ? {
            ...trip.profiles,
            profile_photo_url: await resolveSignedStorageUrl(
              supabase,
              'profile-photos',
              trip.profiles.profile_photo_url
            ),
          }
        : trip.profiles,
    }))
  );

  const filteredTrips = resolvedTrips.filter((trip) => {
    const originMatch = !originQuery || trip.origin?.toLowerCase().includes(originQuery);
    const destinationMatch = !destinationQuery || trip.destination?.toLowerCase().includes(destinationQuery);
    return originMatch && destinationMatch;
  });

  const routeGroups = new Map<string, { origin: string; destination: string; count: number }>();
  for (const trip of allTrips) {
    const key = `${trip.origin}__${trip.destination}`;
    const current = routeGroups.get(key);
    if (current) {
      current.count += 1;
    } else {
      routeGroups.set(key, {
        origin: trip.origin,
        destination: trip.destination,
        count: 1,
      });
    }
  }

  const popularRoutes = Array.from(routeGroups.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <h1 className="text-xl font-bold text-slate-900 mb-3">Find a Lift</h1>

          <form method="get" action="/trips" className="space-y-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <input
                type="text"
                name="origin"
                defaultValue={firstValue(resolvedSearchParams?.origin)}
                placeholder="From (e.g., Cape Town)"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="destination"
                defaultValue={firstValue(resolvedSearchParams?.destination)}
                placeholder="To (e.g., Mthatha)"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search Trips
            </button>
          </form>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {loadError ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Trips are loading with a fallback view right now. Some live data may be missing.
          </div>
        ) : null}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Popular Routes</h2>
          <span className="text-[11px] text-slate-500">{allTrips.length} live trips</span>
        </div>

        {popularRoutes.length > 0 ? (
          <div className="space-y-2">
            {popularRoutes.map((route) => (
              <Link
                key={`${route.origin}-${route.destination}`}
                href={`/trips?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`}
                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-emerald-500 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {route.origin} &rarr; {route.destination}
                    </div>
                    <div className="text-xs text-slate-500">{route.count} trips available</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
            No live routes yet
          </div>
        )}
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Available Trips</h2>
          <span className="text-[11px] text-slate-500">{filteredTrips.length} results</span>
        </div>

        <div className="space-y-3">
          {filteredTrips.length > 0 ? (
            filteredTrips.map((trip) => {
              const driverFirstName = trip.profiles?.first_name || 'Verified';
              const driverSurname = trip.profiles?.surname || '';
              const driverName = `${driverFirstName} ${driverSurname}`.trim() || 'Verified driver';
              const rating = Number(trip.driver_profiles?.rating_average || 0).toFixed(1);
              const ratingCount = trip.driver_profiles?.rating_count || 0;
              const completedTrips = trip.driver_profiles?.completed_trips || 0;
              const vehicleLabel = trip.vehicles
                ? `${trip.vehicles.make} ${trip.vehicles.model}`
                : 'Vehicle not listed';
              const vehicleColour = trip.vehicles?.colour || '';
              const plate = trip.vehicles?.licence_plate || '';

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block bg-white border border-slate-200 rounded-xl p-3 hover:border-emerald-500 transition-all"
                >
                  <div className="flex gap-3 mb-3">
                    <div
                      className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-center bg-cover"
                      style={
                        trip.profiles?.profile_photo_url
                          ? { backgroundImage: `url(${trip.profiles.profile_photo_url})` }
                          : undefined
                      }
                    >
                      {!trip.profiles?.profile_photo_url ? (
                        <Car className="w-6 h-6 text-emerald-600" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900 truncate">{driverName}</span>
                        <Shield className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-slate-600">
                          {rating} ({ratingCount} ratings, {completedTrips} trips)
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-emerald-600">
                        R{formatMoney(trip.cost_share_amount)}
                      </div>
                      <div className="text-[10px] text-slate-500">per seat</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-slate-700">{trip.origin}</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-slate-700">{trip.destination}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatTripDate(trip.departure_date)} {formatTripTime(trip.departure_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{trip.seats_available} seats left</span>
                    </div>
                  </div>

                  {((trip.pickup_points?.length ?? 0) > 0 || (trip.dropoff_points?.length ?? 0) > 0 || trip.luggage_rules) && (
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {formatList(trip.pickup_points) ? (
                        <div>
                          <span className="font-semibold">Pickup:</span> {formatList(trip.pickup_points)}
                        </div>
                      ) : null}
                      {formatList(trip.dropoff_points) ? (
                        <div>
                          <span className="font-semibold">Dropoff:</span> {formatList(trip.dropoff_points)}
                        </div>
                      ) : null}
                      {trip.luggage_rules ? (
                        <div>
                          <span className="font-semibold">Luggage:</span> {trip.luggage_rules}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">{vehicleLabel}</span>
                      {vehicleColour ? ` - ${vehicleColour}` : ''}
                      {isAuthenticated && plate ? ` - ${plate}` : ''}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-sm font-semibold text-slate-900 mb-1">No live trips found</div>
              <div className="text-xs text-slate-500">
                We are only showing trips that are actually published and still have seats available.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
