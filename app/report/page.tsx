'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Upload, Shield } from 'lucide-react';

export default function ReportScammerPage() {
  const [reportType, setReportType] = useState('');

  const reportTypes = [
    { value: 'fake_driver', label: 'Fake driver profile', description: 'Driver profile is fake or impersonating someone' },
    { value: 'no_show', label: 'Took money and blocked me', description: 'Paid but driver disappeared or blocked contact' },
    { value: 'wrong_vehicle', label: 'Wrong vehicle', description: 'Vehicle doesn\'t match profile' },
    { value: 'wrong_plate', label: 'Wrong licence plate', description: 'Licence plate doesn\'t match' },
    { value: 'unsafe_driving', label: 'Unsafe driving', description: 'Reckless or dangerous driving behavior' },
    { value: 'harassment', label: 'Harassment or threatening', description: 'Inappropriate or threatening behavior' },
    { value: 'overcharging', label: 'Overcharging', description: 'Charged more than agreed amount' },
    { value: 'fake_passenger', label: 'Fake passenger', description: 'Passenger profile is suspicious or fake' },
    { value: 'duplicate_account', label: 'Duplicate account', description: 'User has multiple accounts' },
    { value: 'other', label: 'Other', description: 'Something else suspicious' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/member" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Report Scammer</h1>
          <p className="text-xs text-slate-600">Help keep LiftCheck safe</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Warning Banner */}
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-red-900 mb-1">Report Suspicious Activity</h2>
              <p className="text-xs text-red-800">
                Your report helps protect other users. All reports are reviewed by our team within 24 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Report Form */}
        <form className="space-y-4">
          {/* Who are you reporting */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Who are you reporting?</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">User Name or Phone</label>
              <input
                type="text"
                placeholder="e.g., Thabo M. or 082 123 4567"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Report Type */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">What happened?</h2>
            
            <div className="space-y-2">
              {reportTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReportType(type.value)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    reportType === type.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900 mb-0.5">{type.label}</div>
                  <div className="text-xs text-slate-600">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Trip Details (Optional) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Trip Details (Optional)</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trip ID or Route</label>
                <input
                  type="text"
                  placeholder="e.g., Cape Town → Mthatha"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date of Incident</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Tell us what happened</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                placeholder="Provide as much detail as possible..."
                rows={5}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Include details like: what was agreed, what happened, when it happened, any messages exchanged
              </p>
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Evidence (Optional)</h2>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-red-500 transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900 mb-1">Upload screenshots or photos</p>
              <p className="text-xs text-slate-500">PNG, JPG (max 5MB each, up to 3 files)</p>
              <input type="file" className="hidden" accept="image/*" multiple />
            </div>

            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Helpful evidence:</strong> Screenshots of messages, payment confirmations, photos of vehicle/driver that don't match
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Your Contact Info</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Phone Number</label>
                <input
                  type="tel"
                  placeholder="082 123 4567"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Email</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <p className="text-xs text-slate-500">
                We may contact you for more information about this report
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg text-sm font-semibold"
          >
            Submit Report
          </button>

          <div className="bg-slate-100 rounded-lg p-3">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                Your report is confidential. The reported user will not know who reported them.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
