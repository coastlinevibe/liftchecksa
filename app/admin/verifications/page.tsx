import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Camera, FileText, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

async function getPendingVerifications() {
  const supabase = await createClient();

  const { data: driverApplications } = await supabase
    .from('driver_profiles')
    .select(`
      id,
      created_at,
      verification_status,
      id_status,
      vehicle_status,
      id_document_url,
      profiles(
        first_name,
        surname,
        phone,
        email,
        profile_photo_url,
        id_document_url
      )
    `)
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false });

  const { data: recentVehicles } = await supabase
    .from('vehicles')
    .select(`
      id,
      make,
      model,
      colour,
      licence_plate,
      created_at,
      driver_id
    `)
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false });

  const vehiclesWithDrivers = [];
  if (recentVehicles && recentVehicles.length > 0) {
    for (const vehicle of recentVehicles) {
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('user_id')
        .eq('id', vehicle.driver_id)
        .single();

      let driverName = { first_name: 'Unknown', surname: '' };
      if (driverProfile?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, surname')
          .eq('user_id', driverProfile.user_id)
          .single();

        if (profile) {
          driverName = profile;
        }
      }

      vehiclesWithDrivers.push({
        ...vehicle,
        driver: driverName,
      });
    }
  }

  return {
    driverApplications: driverApplications || [],
    vehicleApplications: vehiclesWithDrivers || [],
  };
}

export default async function AdminVerificationsPage() {
  const applications = await getPendingVerifications();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <Link href="/admin" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to admin
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Pending Verifications</h1>
          <p className="text-xs text-slate-600">
            {applications.driverApplications.length} driver application{applications.driverApplications.length !== 1 ? 's' : ''}
            {' '}and {applications.vehicleApplications.length} vehicle application{applications.vehicleApplications.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-6xl mx-auto">
        {applications.driverApplications.length > 0 ? (
          <div className="space-y-3">
            {applications.driverApplications.map((application: any) => {
              const profile = application.profiles || null;
              const hasIdDoc = profile?.id_document_url || application.id_document_url;
              const hasSelfie = profile?.profile_photo_url;
              const timeAgo = new Date(application.created_at).toLocaleDateString();

              return (
                <div key={application.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-4">
                    {hasSelfie ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-200">
                        <Image src={hasSelfie} alt="Selfie" width={64} height={64} className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="text-lg font-bold text-slate-900 mb-1">
                        {profile ? `${profile.first_name} ${profile.surname}` : 'Profile missing'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-slate-600">Phone:</span>
                          <span className="font-semibold text-slate-900 ml-1">{profile?.phone || 'Unavailable'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Email:</span>
                          <span className="font-semibold text-slate-900 ml-1">{profile?.email || 'Unavailable'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Applied:</span>
                          <span className="font-semibold text-slate-900 ml-1">{timeAgo}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${hasIdDoc ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          <FileText className="w-3 h-3" />
                          ID: {hasIdDoc ? 'Uploaded' : 'Missing'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${hasSelfie ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          <Camera className="w-3 h-3" />
                          Selfie: {hasSelfie ? 'Uploaded' : 'Missing'}
                        </span>
                        {!profile ? (
                          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">
                            Linked profile missing
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <Link
                      href={`/admin/verifications/${application.id}`}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-base font-semibold text-slate-900 mb-1">No pending verifications</h3>
            <p className="text-sm text-slate-600">All driver applications have been reviewed</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Vehicle Applications</h2>
            <span className="text-xs text-slate-500">{applications.vehicleApplications.length} pending</span>
          </div>
          {applications.vehicleApplications.length > 0 ? (
            <div className="space-y-2">
              {applications.vehicleApplications.map((vehicle: any) => {
                const timeAgo = new Date(vehicle.created_at).toLocaleDateString();

                return (
                  <div key={vehicle.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Car className="w-10 h-10 text-slate-400" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-xs text-slate-600">
                        {vehicle.licence_plate} • {vehicle.driver?.first_name} {vehicle.driver?.surname} • {timeAgo}
                      </div>
                    </div>
                    <Link
                      href={`/admin/verifications/${vehicle.driver_id}`}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold"
                    >
                      Review
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              No pending vehicle applications
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
