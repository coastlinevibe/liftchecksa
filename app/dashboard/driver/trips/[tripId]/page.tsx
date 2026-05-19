import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Car,
  MapPin,
  Save,
  Shield,
  Star,
} from 'lucide-react';
import { getDriverTripById, updateDriverTrip } from '@/lib/trips/actions';
import { createClient } from '@/lib/supabase/server';
import { resolveSignedStorageUrl } from '@/lib/supabase/storage';

type DriverVehicle = {
  id: string;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  licence_plate?: string | null;
  year?: number | null;
  vehicle_photo_url?: string | null;
  verification_status?: string | null;
  is_active?: boolean | null;
};

type DriverTripDetails = {
  profile?: {
    first_name?: string | null;
    surname?: string | null;
    profile_photo_url?: string | null;
  } | null;
  driverProfile?: {
    completed_trips?: number | null;
    rating_average?: number | string | null;
    rating_count?: number | null;
    verification_status?: string | null;
  } | null;
  trip: {
    id: string;
    origin: string;
    destination: string;
    route_corridor?: string | null;
    departure_date: string;
    departure_time: string;
    seats_total: number;
    seats_available: number;
    cost_share_amount: number | string;
    luggage_rules?: string | null;
    pickup_points?: string[] | null;
    dropoff_points?: string[] | null;
    notes?: string | null;
    passenger_rules?: string | null;
    status: string;
    vehicle_id?: string | null;
    vehicles?: DriverVehicle | null;
  };
  vehicles: DriverVehicle[];
};

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatTime(timeString: string) {
  return timeString ? timeString.slice(0, 5) : 'TBA';
}

function listToTextarea(value?: string[] | string | null) {
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'string') return value;
  return '';
}

export default async function DriverTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams?: Promise<{ updated?: string; update_error?: string }>;
}) {
  const { tripId } = await params;
  const resolvedSearchParams = await searchParams;
  const { trip, profile, vehicles, driverProfile } = (await getDriverTripById(tripId)) as DriverTripDetails;
  const supabase = await createClient();

  const resolvedDriverPhotoUrl = await resolveSignedStorageUrl(
    supabase,
    'profile-photos',
    profile?.profile_photo_url
  );

  const currentVehicle = trip.vehicles || vehicles.find((vehicle) => vehicle.id === trip.vehicle_id);
  const resolvedVehiclePhotoUrl = currentVehicle?.vehicle_photo_url
    ? await resolveSignedStorageUrl(
        supabase,
        'vehicle-photos',
        currentVehicle.vehicle_photo_url
      )
    : '';

  const bookedSeats = Math.max((trip.seats_total || 0) - (trip.seats_available || 0), 0);
  const ratingAverage = Number(driverProfile?.rating_average || 0).toFixed(1);
  const vehicleOptions = vehicles || [];
  const selectedVehicleId = trip.vehicle_id || currentVehicle?.id || '';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/driver" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Manage Trip</h1>
          <p className="text-xs text-slate-600">
            Driver view for {trip.origin} to {trip.destination}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {resolvedSearchParams?.updated === '1' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
            <div className="text-sm font-semibold text-emerald-900">Trip updated</div>
            <p className="text-xs text-emerald-800 mt-1">Your changes were saved successfully.</p>
          </div>
        )}

        {resolvedSearchParams?.update_error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
            <div className="text-sm font-semibold text-rose-900">Update failed</div>
            <p className="text-xs text-rose-800 mt-1">{resolvedSearchParams.update_error}</p>
          </div>
        )}

        <div className="bg-emerald-500 rounded-xl p-4 mb-4 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
              {resolvedDriverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedDriverPhotoUrl}
                  alt={`${profile?.first_name || 'Driver'} profile photo`}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <Car className="w-8 h-8 text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">
                  {profile?.first_name || 'Driver'} {profile?.surname || ''}
                </span>
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 fill-white" />
                <span className="text-sm">{ratingAverage} Rating</span>
                <span className="text-sm opacity-75">• {driverProfile?.completed_trips || 0} trips</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-xs opacity-90">
                  {driverProfile?.verification_status === 'approved' ? 'Zii Verify Active' : 'Verification Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs opacity-75 mb-0.5">Vehicle</div>
                <div className="font-semibold">
                  {currentVehicle?.make ? `${currentVehicle.make} ${currentVehicle.model}` : 'Not listed'}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-75 mb-0.5">Seats</div>
                <div className="font-semibold">
                  {bookedSeats} of {trip.seats_total}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-75 mb-0.5">Status</div>
                <div className="font-semibold">{trip.status}</div>
              </div>
              <div>
                <div className="text-xs opacity-75 mb-0.5">Verified</div>
                <div className="font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {trip.vehicles?.verification_status === 'approved' ? 'Yes' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Trip Preview</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-0.5">Route</div>
                <div className="text-sm font-semibold text-slate-900">
                  {trip.origin} to {trip.destination}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Date</div>
                  <div className="text-sm font-semibold text-slate-900">{formatDate(trip.departure_date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Time</div>
                  <div className="text-sm font-semibold text-slate-900">{formatTime(trip.departure_time)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Vehicle Snapshot</h2>
          <div className="flex items-start gap-3">
            <div className="w-24 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
              {resolvedVehiclePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedVehiclePhotoUrl}
                  alt={`${currentVehicle?.make || 'Vehicle'} photo`}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <Car className="w-7 h-7 text-slate-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900 mb-1">
                {currentVehicle?.make || 'Vehicle not listed'} {currentVehicle?.model || ''}
              </div>
              <div className="text-xs text-slate-600 mb-2">{currentVehicle?.colour || 'Colour not listed'}</div>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span className="text-xs text-emerald-600">
                  {currentVehicle?.verification_status === 'approved' ? 'Vehicle verified' : 'Vehicle pending verification'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form action={updateDriverTrip} className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-4">
          <input type="hidden" name="tripId" value={trip.id} />

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Edit Trip</h2>
            <Link href={`/trips/${trip.id}`} className="text-xs font-semibold text-emerald-600">
              Open public view
            </Link>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Origin</label>
            <input
              name="origin"
              defaultValue={trip.origin}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Destination</label>
            <input
              name="destination"
              defaultValue={trip.destination}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Route Corridor</label>
            <input
              name="routeCorridor"
              defaultValue={trip.route_corridor || ''}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                name="departureDate"
                defaultValue={trip.departure_date}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Time</label>
              <input
                type="time"
                name="departureTime"
                defaultValue={formatTime(trip.departure_time)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Seats Total</label>
              <select
                name="seatsTotal"
                defaultValue={String(trip.seats_total)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: 8 }, (_, index) => index + 1).map((seat) => (
                  <option key={seat} value={seat}>{seat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price per Seat</label>
              <input
                type="number"
                name="costShareAmount"
                defaultValue={String(trip.cost_share_amount)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vehicle</label>
            <select
              name="vehicleId"
              defaultValue={selectedVehicleId}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} - {vehicle.colour}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pickup Points</label>
            <textarea
              name="pickupPoints"
              rows={2}
              defaultValue={listToTextarea(trip.pickup_points)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Drop-off Points</label>
            <textarea
              name="dropoffPoints"
              rows={2}
              defaultValue={listToTextarea(trip.dropoff_points)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Luggage Rules</label>
            <input
              name="luggageRules"
              defaultValue={trip.luggage_rules || ''}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passenger Rules</label>
            <textarea
              name="passengerRules"
              rows={3}
              defaultValue={trip.passenger_rules || ''}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Additional Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={trip.notes || ''}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trip Status</label>
            <select
              name="status"
              defaultValue={trip.status}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="full">Full</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Link
              href="/dashboard/driver"
              className="flex-1 bg-white border-2 border-slate-200 text-slate-900 py-3 rounded-lg text-sm font-semibold text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
          Passenger chat and booking requests stay on the public trip page. This driver page is just for viewing and editing your own trip.
        </div>
      </div>
    </div>
  );
}
