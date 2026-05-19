import Link from 'next/link';
import { ArrowLeft, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

async function getDrivers() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('driver_profiles')
    .select('id, user_id, verification_status, completed_trips, rating_average, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const drivers = [];
  if (data && data.length > 0) {
    for (const driver of data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, surname, phone')
        .eq('user_id', driver.user_id)
        .single();

      drivers.push({ ...driver, profile });
    }
  }

  return drivers;
}

export default async function AdminDriversPage() {
  const drivers = await getDrivers();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <Link href="/admin" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to admin
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Drivers</h1>
          <p className="text-xs text-slate-600">{drivers.length} driver{drivers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          {drivers.length > 0 ? (
            <div className="space-y-2">
              {drivers.map((driver: any) => (
                <div key={driver.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {driver.profile?.first_name} {driver.profile?.surname}
                      </div>
                      <div className="text-xs text-slate-600 truncate">{driver.profile?.phone}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-slate-700 capitalize">
                      {driver.verification_status}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {driver.completed_trips || 0} trips
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">No drivers yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
