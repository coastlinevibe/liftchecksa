'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateTripPage() {
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
          Routes are managed by admins. Drivers are assigned to official routes after approval.
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
