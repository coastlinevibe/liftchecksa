'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Share2, Users, Clock, Shield, AlertCircle, StopCircle } from 'lucide-react';

export default function TripSharePage() {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/trips/trip-123" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to trip
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Trip Share</h1>
              <p className="text-xs text-slate-600">Share your live location</p>
            </div>
            <div className="bg-purple-100 px-2 py-1 rounded text-xs font-semibold text-purple-700">
              Plus Feature
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Trip Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base font-bold text-slate-900">Thabo M.</span>
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xs text-slate-600">Cape Town → Mthatha</div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-600">Departure:</span>
                <span className="font-semibold text-slate-900">Fri, 16 May • 16:00</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-600">Estimated duration:</span>
              <span className="font-semibold text-slate-900">8 hours</span>
            </div>
          </div>
        </div>

        {!isSharing ? (
          <>
            {/* What is Trip Share */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <h2 className="text-sm font-bold text-blue-900 mb-2">What is Trip Share?</h2>
              <ul className="space-y-1.5 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Share your live location with a trusted contact during your trip</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Location sharing stops automatically when trip ends</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>You can stop sharing anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Only your selected contact can see your location</span>
                </li>
              </ul>
            </div>

            {/* Select Contact */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Share with Trusted Contact</h2>
              
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => setSelectedContact('mom')}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedContact === 'mom'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">Mom</div>
                      <div className="text-xs text-slate-600">082 123 4567</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedContact('sister')}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedContact === 'sister'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">Sister</div>
                      <div className="text-xs text-slate-600">083 987 6543</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedContact('friend')}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedContact === 'friend'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">Best Friend</div>
                      <div className="text-xs text-slate-600">084 555 1234</div>
                    </div>
                  </div>
                </button>
              </div>

              <Link
                href="/settings/trusted-contacts"
                className="block text-center text-xs text-emerald-600 font-semibold"
              >
                + Add New Trusted Contact
              </Link>
            </div>

            {/* Privacy Notice */}
            <div className="bg-slate-100 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <Shield className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 mb-1">Privacy Protected</div>
                  <p className="text-xs text-slate-600">
                    Your location is only shared with your selected contact and automatically stops when the trip ends.
                  </p>
                </div>
              </div>
            </div>

            {/* Start Sharing Button */}
            <button
              onClick={() => setIsSharing(true)}
              disabled={!selectedContact}
              className={`w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                selectedContact
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Share2 className="w-4 h-4" />
              Start Trip Share
            </button>
          </>
        ) : (
          <>
            {/* Active Sharing */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-500 p-2 rounded-full">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-emerald-900">Trip Share Active</div>
                  <div className="text-xs text-emerald-700">Sharing location with Mom</div>
                </div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-slate-600 mb-1">Current Location</div>
                <div className="text-sm font-semibold text-slate-900 mb-2">N2 Highway, near George</div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Started: 16:05</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>234 km traveled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm text-slate-600">Live Map View</div>
                  <div className="text-xs text-slate-500">Your route is being tracked</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-600 mb-0.5">Distance Remaining</div>
                  <div className="font-semibold text-slate-900">566 km</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-600 mb-0.5">Est. Arrival</div>
                  <div className="font-semibold text-slate-900">23:45</div>
                </div>
              </div>
            </div>

            {/* Shared With */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Shared With</h2>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">Mom</div>
                  <div className="text-xs text-emerald-600">Viewing your location</div>
                </div>
              </div>
            </div>

            {/* Stop Sharing */}
            <button
              onClick={() => setIsSharing(false)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 mb-3"
            >
              <StopCircle className="w-4 h-4" />
              Stop Trip Share
            </button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Trip Share will automatically stop when you mark the trip as completed or after 12 hours.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
