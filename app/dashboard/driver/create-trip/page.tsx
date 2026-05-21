'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Car, Package, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { createTrip, getDriverVehicles } from '@/lib/trips/actions';
import { PILOT_ROUTE_MODE } from '@/lib/feature-flags';

type VehicleOption = {
  id: string;
  make: string;
  model: string;
  colour: string;
  licence_plate: string;
};

export default function CreateTripPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tripSlug, setTripSlug] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    pickupPoint: '',
    dropoffPoint: '',
    departureDate: '',
    departureTime: '',
    costShareAmount: '350',
    seatsTotal: '2',
    vehicleId: '',
    luggageRules: '1 small bag per person',
    passengerRules: '',
    notes: '',
  });

  async function loadVehicles() {
    const result = await getDriverVehicles();
    if (result.vehicles) {
      setVehicles(result.vehicles as VehicleOption[]);
      if (result.vehicles.length > 0) {
        setFormData(prev => ({ ...prev, vehicleId: result.vehicles[0].id }));
      }
    }
    setVehiclesLoaded(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVehicles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (PILOT_ROUTE_MODE) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="px-4 py-4 max-w-md mx-auto">
            <Link href="/dashboard/driver" className="inline-flex items-center text-slate-600 text-sm mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to dashboard
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Create New Trip</h1>
          </div>
        </div>

        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Pilot mode uses verified official routes only. Open trip posting is disabled while the route pilot is active.
          </div>

          <Link
            href="/dashboard/driver/routes"
            className="mt-4 block rounded-lg bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Go to Assigned Routes
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createTrip({
        vehicleId: formData.vehicleId,
        origin: formData.origin,
        destination: formData.destination,
        departureDate: formData.departureDate,
        departureTime: formData.departureTime,
        seatsTotal: parseInt(formData.seatsTotal),
        costShareAmount: parseFloat(formData.costShareAmount),
        luggageRules: formData.luggageRules,
        pickupPoints: formData.pickupPoint ? [formData.pickupPoint] : undefined,
        dropoffPoints: formData.dropoffPoint ? [formData.dropoffPoint] : undefined,
        notes: formData.notes || undefined,
        passengerRules: formData.passengerRules || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.trip) {
        setTripSlug(result.trip.public_slug);
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const shareUrl = `${window.location.origin}/trip-share/${tripSlug}`;

    const handleCopyLink = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const copied = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (!copied) throw new Error('Copy failed');
        }

        setCopyState('copied');
        window.setTimeout(() => setCopyState('idle'), 2000);
      } catch {
        setCopyState('failed');
        window.setTimeout(() => setCopyState('idle'), 2000);
      }
    };
    
    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Trip Published!</h1>
            <p className="text-sm text-slate-600">Share your trip link on Facebook or WhatsApp</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <div className="text-xs text-slate-600 mb-2 font-semibold">Your Trip Link:</div>
            <div className="bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 break-all">
              {shareUrl}
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <button
              onClick={handleCopyLink}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold"
            >
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy Failed' : 'Copy Link'}
            </button>
            <Link
              href="/dashboard/driver"
              className="block w-full bg-white border-2 border-slate-200 text-slate-900 py-3 rounded-lg text-sm font-semibold text-center"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Share this link in your Facebook lift group or WhatsApp group. Passengers can view your verified profile before booking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/driver" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Create New Trip</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {vehiclesLoaded && vehicles.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <h2 className="text-sm font-bold text-amber-900 mb-1">Verified vehicle required</h2>
            <p className="text-xs text-amber-800 mb-3">
              You need an approved vehicle before you can publish a trip.
            </p>
            <Link
              href="/dashboard/driver/vehicles"
              className="inline-flex items-center justify-center w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-semibold"
            >
              Go to Vehicles
            </Link>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Route Details</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="e.g., Cape Town"
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="e.g., Mthatha"
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pickup Point</label>
                  <input
                    type="text"
                    value={formData.pickupPoint}
                    onChange={(e) => setFormData({ ...formData, pickupPoint: e.target.value })}
                    placeholder="e.g., Corner of Adderley & Strand Street"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Drop-off Point</label>
                  <input
                    type="text"
                    value={formData.dropoffPoint}
                    onChange={(e) => setFormData({ ...formData, dropoffPoint: e.target.value })}
                    placeholder="e.g., Mthatha Plaza, N2 Highway"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Date & Time</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={formData.departureDate}
                      onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="time"
                      value={formData.departureTime}
                      onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (formData.origin && formData.destination && formData.departureDate && formData.departureTime) {
                  setStep(2);
                  setError('');
                } else {
                  setError('Please fill in all required fields');
                }
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Pricing & Seats</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price per Seat</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      R
                    </span>
                    <input
                      type="number"
                      value={formData.costShareAmount}
                      onChange={(e) => setFormData({ ...formData, costShareAmount: e.target.value })}
                      placeholder="350"
                      min="0"
                      step="0.01"
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Cost-share amount per passenger</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Available Seats</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={formData.seatsTotal}
                      onChange={(e) => setFormData({ ...formData, seatsTotal: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="1">1 seat</option>
                      <option value="2">2 seats</option>
                      <option value="3">3 seats</option>
                      <option value="4">4 seats</option>
                      <option value="5">5 seats</option>
                      <option value="6">6 seats</option>
                      <option value="7">7 seats</option>
                      <option value="8">8 seats</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Vehicle</h2>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Vehicle</label>
                {vehiclesLoaded && vehicles.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      No approved vehicles found yet. Add a vehicle and wait for verification before creating a trip.
                    </p>
                    <Link
                      href="/dashboard/driver/vehicles"
                      className="inline-block mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Go to Vehicles →
                    </Link>
                  </div>
                ) : (
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={formData.vehicleId}
                      onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.make} {vehicle.model} - {vehicle.colour} ({vehicle.licence_plate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-900 py-3 rounded-lg text-sm font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (formData.costShareAmount && formData.vehicleId) {
                    setStep(3);
                    setError('');
                  } else {
                    setError('Please fill in all required fields');
                  }
                }}
                disabled={vehicles.length === 0}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Trip Rules</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Luggage Allowance</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={formData.luggageRules}
                      onChange={(e) => setFormData({ ...formData, luggageRules: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>1 small bag per person</option>
                      <option>1 medium bag per person</option>
                      <option>1 large bag per person</option>
                      <option>No luggage</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passenger Rules</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                      value={formData.passengerRules}
                      onChange={(e) => setFormData({ ...formData, passengerRules: e.target.value })}
                      placeholder="e.g., No smoking, no loud music, be on time"
                      rows={3}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Additional Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any other information passengers should know"
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs text-emerald-800">
                <strong>Ready to publish?</strong> Your trip will be visible to all members and you will receive a shareable link for Facebook/WhatsApp.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-900 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-semibold"
              >
                {loading ? 'Publishing...' : 'Publish Trip'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
