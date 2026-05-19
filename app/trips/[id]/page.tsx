import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Star,
  MapPin,
  Calendar,
  Clock,
  Users,
  Car,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTripById } from '@/lib/trips/actions';
import TripActions from './TripActions';

type ReviewCard = {
  id: string;
  rating: number;
  feedback?: string | null;
  reviewerName: string;
};

function formatTripDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatTripTime(timeValue: string) {
  return timeValue ? timeValue.slice(0, 5) : '';
}

function formatDistance(points?: string[]) {
  if (!points || points.length === 0) return 'Not specified';
  return points.join(' • ');
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

export default async function TripDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ booked?: string; booking_error?: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const { trip } = await getTripById(id);

  if (!trip) {
    notFound();
  }

  const [resolvedDriverPhotoUrl, resolvedVehiclePhotoUrl] = await Promise.all([
    resolveSignedStorageUrl(supabase, 'profile-photos', trip.profiles?.profile_photo_url),
    resolveSignedStorageUrl(supabase, 'vehicle-photos', trip.vehicles?.vehicle_photo_url),
  ]);

  const { data: ratings } = await supabase
    .from('ratings')
    .select('id, trip_id, reviewer_id, rating, feedback, created_at')
    .eq('trip_id', trip.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const reviewCards = await Promise.all(
    (ratings || []).map(async (rating) => {
      const { data: reviewerProfile } = await supabase
        .from('profiles')
        .select('first_name, surname')
        .eq('id', rating.reviewer_id)
        .single();

      return {
        ...rating,
        reviewerName: reviewerProfile
          ? `${reviewerProfile.first_name} ${reviewerProfile.surname}`
          : 'Passenger',
      };
    })
  );

  const driverFirstName = trip.profiles?.first_name || 'Verified';
  const driverSurname = trip.profiles?.surname || '';
  const driverName = `${driverFirstName} ${driverSurname}`.trim();
  const ratingAverage = Number(trip.driver_profiles?.rating_average || 0).toFixed(1);
  const completedTrips = trip.driver_profiles?.completed_trips || 0;
  const driverVerification = trip.driver_profiles?.verification_status || trip.driver_verification_status || 'pending';
  const vehicleLabel = trip.vehicles
    ? `${trip.vehicles.make} ${trip.vehicles.model} ${trip.vehicles.year ? trip.vehicles.year : ''}`.trim()
    : 'Vehicle not listed';
  const vehicleColour = trip.vehicles?.colour || '';
  const plate = trip.vehicles?.licence_plate || '';
  const pickupPoints = trip.pickup_points || [];
  const dropoffPoints = trip.dropoff_points || [];
  const luggageRules = trip.luggage_rules || 'No special luggage rules listed';
  const passengerRules = trip.passenger_rules || 'No special passenger rules listed';
  const notes = trip.notes || 'No extra notes from the driver.';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/trips" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to trips
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Trip Details</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {resolvedSearchParams?.booked === '1' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
            <div className="text-sm font-semibold text-emerald-900">Booking request sent</div>
            <p className="text-xs text-emerald-800 mt-1">
              The driver will see your request and respond soon.
            </p>
          </div>
        )}

        {resolvedSearchParams?.booking_error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
            <div className="text-sm font-semibold text-rose-900">Booking could not be sent</div>
            <p className="text-xs text-rose-800 mt-1">{resolvedSearchParams.booking_error}</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 mb-4 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
              {resolvedDriverPhotoUrl ? (
                <img
                  src={resolvedDriverPhotoUrl}
                  alt={`${driverName} profile photo`}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                />
              ) : (
                <Car className="w-8 h-8 text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">{driverName}</span>
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 fill-white" />
                <span className="text-sm">
                  {ratingAverage} Rating
                </span>
                <span className="text-sm opacity-75">• {completedTrips} trips</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-xs opacity-90">
                  {driverVerification === 'approved' ? 'Zii Verify Active' : 'Verification Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs opacity-75 mb-0.5">Vehicle</div>
                <div className="font-semibold">{vehicleLabel}</div>
              </div>
              <div>
                <div className="text-xs opacity-75 mb-0.5">Colour</div>
                <div className="font-semibold">{vehicleColour || 'Not listed'}</div>
              </div>
              {isAuthenticated && plate ? (
                <div>
                  <div className="text-xs opacity-75 mb-0.5">Licence Plate</div>
                  <div className="font-semibold">{plate}</div>
                </div>
              ) : null}
              <div>
                <div className="text-xs opacity-75 mb-0.5">Verified</div>
                <div className="font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {driverVerification === 'approved' ? 'Yes' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-amber-900 mb-1">
                {isAuthenticated ? 'Match Check Required' : 'Safety First'}
              </div>
              <p className="text-xs text-amber-800">
                {isAuthenticated
                  ? 'Before getting in, confirm the driver\'s face, vehicle and licence plate match this profile.'
                  : 'Sign up to view full driver details including license plate for your safety.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Trip Information</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-0.5">Pickup</div>
                <div className="text-sm font-semibold text-slate-900">{trip.origin}</div>
                <div className="text-xs text-slate-600">{formatDistance(pickupPoints)}</div>
              </div>
            </div>

            <div className="border-l-2 border-dashed border-slate-200 ml-6 h-4" />

            <div className="flex items-start gap-3">
              <div className="bg-slate-100 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-0.5">Drop-off</div>
                <div className="text-sm font-semibold text-slate-900">{trip.destination}</div>
                <div className="text-xs text-slate-600">{formatDistance(dropoffPoints)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <div className="text-sm font-semibold text-slate-900">{formatTripDate(trip.departure_date)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-500">Time</div>
                <div className="text-sm font-semibold text-slate-900">{formatTripTime(trip.departure_time)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Price per seat</div>
              <div className="text-2xl font-bold text-emerald-600">
                R{Number(trip.cost_share_amount || 0).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Seats available</div>
              <div className="flex items-center gap-1 text-lg font-bold text-slate-900">
                <Users className="w-5 h-5 text-slate-400" />
                {trip.seats_available} of {trip.seats_total}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-600 mb-2">
              <strong>Luggage:</strong> {luggageRules}
            </div>
            <div className="text-xs text-slate-600">
              <strong>Rules:</strong> {passengerRules}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Vehicle Details</h2>
          <div className="flex items-start gap-3">
            <div className="w-24 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
              {resolvedVehiclePhotoUrl ? (
                <img
                  src={resolvedVehiclePhotoUrl}
                  alt={`${vehicleLabel} vehicle photo`}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                />
              ) : (
                <Car className="w-7 h-7 text-slate-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900 mb-1">{vehicleLabel}</div>
              <div className="text-xs text-slate-600 mb-2">
                {vehicleColour || 'Colour not listed'}
              </div>
              {isAuthenticated && plate ? (
                <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-bold text-slate-900">
                  {plate}
                </div>
              ) : null}
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span className="text-xs text-emerald-600">
                  {trip.vehicles?.verification_status === 'approved'
                    ? 'Vehicle verified'
                    : trip.vehicles?.verification_status
                      ? `Vehicle ${trip.vehicles.verification_status}`
                      : 'Vehicle pending verification'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Trip Notes</h2>
          <p className="text-xs text-slate-700 leading-5">{notes}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Recent Reviews</h2>
          {reviewCards.length > 0 ? (
            <div className="space-y-3">
              {(reviewCards as ReviewCard[]).map((review) => (
                <div key={review.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`w-3 h-3 ${
                            index < Math.round(review.rating)
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-600">• {review.reviewerName}</span>
                  </div>
                  <p className="text-xs text-slate-700">{review.feedback || 'No written feedback left.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No reviews yet for this trip.</div>
          )}
        </div>

        <TripActions tripId={trip.id} isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
