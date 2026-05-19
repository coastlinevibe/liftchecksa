'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Shield, AlertTriangle, Car, User } from 'lucide-react';

export default function MatchCheckPage() {
  const [checks, setChecks] = useState({
    face: false,
    vehicle: false,
    plate: false,
  });

  const allChecked = checks.face && checks.vehicle && checks.plate;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/trips/trip-123" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to trip
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Match Check</h1>
          <p className="text-xs text-slate-600">Confirm before you get in</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Safety Warning */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-amber-900 mb-1">Safety Check Required</h2>
              <p className="text-xs text-amber-800">
                Before getting in, confirm all three items match the driver profile. If anything doesn't match, do not get in and report immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Driver Profile Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 mb-4 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-16 h-16 bg-white rounded-full flex-shrink-0 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">Thabo M.</span>
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-sm opacity-90">Verified Driver</div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs opacity-75">Vehicle</div>
              <div className="font-semibold">Toyota Corolla</div>
            </div>
            <div>
              <div className="text-xs opacity-75">Colour</div>
              <div className="font-semibold">White</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs opacity-75">Licence Plate</div>
              <div className="text-xl font-bold">CA 123-456</div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Verification Checklist</h2>
          
          <div className="space-y-3">
            {/* Check 1: Face */}
            <button
              onClick={() => setChecks({ ...checks, face: !checks.face })}
              className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                checks.face
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${checks.face ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                  <User className={`w-5 h-5 ${checks.face ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">Driver's Face Matches</h3>
                    {checks.face ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Compare the driver's face with the profile photo above
                  </p>
                </div>
              </div>
            </button>

            {/* Check 2: Vehicle */}
            <button
              onClick={() => setChecks({ ...checks, vehicle: !checks.vehicle })}
              className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                checks.vehicle
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${checks.vehicle ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                  <Car className={`w-5 h-5 ${checks.vehicle ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">Vehicle Matches</h3>
                    {checks.vehicle ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    White Toyota Corolla - check make, model and colour
                  </p>
                </div>
              </div>
            </button>

            {/* Check 3: Plate */}
            <button
              onClick={() => setChecks({ ...checks, plate: !checks.plate })}
              className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                checks.plate
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${checks.plate ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                  <Shield className={`w-5 h-5 ${checks.plate ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">Licence Plate Matches</h3>
                    {checks.plate ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Confirm plate number: <strong>CA 123-456</strong>
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Zii Verify Option */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-2">Zii Verify</h2>
          <p className="text-xs text-slate-600 mb-3">
            Use Zii Bluetooth verification for additional security, especially if you have no data.
          </p>
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold">
            Start Zii Verification
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {allChecked ? (
            <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Confirm & Check In
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-slate-300 text-slate-500 py-3 rounded-lg text-sm font-semibold cursor-not-allowed"
            >
              Complete All Checks First
            </button>
          )}

          <button className="w-full bg-white border-2 border-red-500 text-red-600 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-50">
            <XCircle className="w-5 h-5" />
            Something Doesn't Match - Report
          </button>
        </div>

        {/* Safety Note */}
        <div className="mt-4 bg-slate-100 rounded-lg p-3">
          <p className="text-xs text-slate-600 text-center">
            If anything doesn't match or feels unsafe, do not get in the vehicle. Report the issue immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
