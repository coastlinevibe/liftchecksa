import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Car } from 'lucide-react';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import ApproveRejectButtons from './[id]/ApproveRejectButtons';
import VehicleApproveButtons from './[id]/VehicleApproveButtons';

async function getPendingVerifications() {
  noStore();

  const supabase = await createClient();

  const { data: driverRows, error: driverRowsError } = await supabase
    .from('driver_profiles')
    .select(`
      id,
      user_id,
      id_status,
      provider_plan
    `)
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false });

  if (driverRowsError) {
    console.error('[admin/verifications] driver_profiles query failed', {
      message: driverRowsError.message,
      details: driverRowsError.details,
      hint: driverRowsError.hint,
      code: driverRowsError.code,
    });
  }

  const userIds = Array.from(
    new Set((driverRows || []).map((row: any) => row.user_id).filter(Boolean))
  );

  let profilesByUserId = new Map<string, any>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, first_name, surname, phone, email')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('[admin/verifications] profiles query failed', {
        message: profilesError.message,
        details: profilesError.details,
        hint: profilesError.hint,
        code: profilesError.code,
        userIds,
      });
    }

    profilesByUserId = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
  }

  const driverApplications = (driverRows || [])
    .filter((application: any) => application.id_status !== 'approved' && application.id_status !== 'rejected')
    .map((application: any) => ({
      ...application,
      profile: profilesByUserId.get(application.user_id) || null,
    }));

  const { data: vehicleRows, error: vehicleRowsError } = await supabase
    .from('vehicles')
    .select(`
      id,
      driver_id,
      make,
      model,
      colour,
      licence_plate,
      year,
      vehicle_photo_url,
      verification_status,
      created_at
    `)
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false });

  if (vehicleRowsError) {
    console.error('[admin/verifications] vehicles query failed', {
      message: vehicleRowsError.message,
      details: vehicleRowsError.details,
      hint: vehicleRowsError.hint,
      code: vehicleRowsError.code,
    });
  }

  const vehicleDriverIds = Array.from(
    new Set((vehicleRows || []).map((vehicle: any) => vehicle.driver_id).filter(Boolean))
  );

  let driverProfilesById = new Map<string, any>();

  if (vehicleDriverIds.length > 0) {
    const { data: vehicleDriverProfiles, error: vehicleDriverProfilesError } = await supabase
      .from('driver_profiles')
      .select('id, user_id')
      .in('id', vehicleDriverIds);

    if (vehicleDriverProfilesError) {
      console.error('[admin/verifications] vehicle driver_profiles query failed', {
        message: vehicleDriverProfilesError.message,
        details: vehicleDriverProfilesError.details,
        hint: vehicleDriverProfilesError.hint,
        code: vehicleDriverProfilesError.code,
      });
    }

    driverProfilesById = new Map((vehicleDriverProfiles || []).map((row: any) => [row.id, row]));
  }

  const vehicleUserIds = Array.from(
    new Set(
      Array.from(driverProfilesById.values())
        .map((driverProfile: any) => driverProfile.user_id)
        .filter(Boolean)
    )
  );

  let vehicleProfilesByUserId = new Map<string, any>();

  if (vehicleUserIds.length > 0) {
    const { data: vehicleProfiles, error: vehicleProfilesError } = await supabase
      .from('profiles')
      .select('user_id, first_name, surname, phone, email')
      .in('user_id', vehicleUserIds);

    if (vehicleProfilesError) {
      console.error('[admin/verifications] vehicle profiles query failed', {
        message: vehicleProfilesError.message,
        details: vehicleProfilesError.details,
        hint: vehicleProfilesError.hint,
        code: vehicleProfilesError.code,
      });
    }

    vehicleProfilesByUserId = new Map((vehicleProfiles || []).map((profile: any) => [profile.user_id, profile]));
  }

  const vehicleApplications = (vehicleRows || []).map((vehicle: any) => {
    const driverProfile = driverProfilesById.get(vehicle.driver_id) || null;
    const profile = driverProfile ? vehicleProfilesByUserId.get(driverProfile.user_id) || null : null;

    return {
      ...vehicle,
      driverProfileId: vehicle.driver_id,
      profile,
    };
  });

  return {
    driverApplications,
    vehicleApplications,
  };
}

export default async function AdminVerificationsPage() {
  const applications = await getPendingVerifications();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
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

      <div className="px-4 py-4 max-w-4xl mx-auto">
        {applications.driverApplications.length > 0 ? (
          <div className="space-y-3">
            {applications.driverApplications.map((application: any) => (
              <div key={application.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-3">Basic Registration</div>
                <div className="grid grid-cols-1 gap-2 text-sm mb-4">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500 mb-0.5">Plan</div>
                    <div className="font-semibold text-slate-900">{application.provider_plan || 'provider_annual'}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500 mb-0.5">First Name</div>
                    <div className="font-semibold text-slate-900">{application.profile?.first_name || 'Unavailable'}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500 mb-0.5">Surname</div>
                    <div className="font-semibold text-slate-900">{application.profile?.surname || 'Unavailable'}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500 mb-0.5">Phone</div>
                    <div className="font-semibold text-slate-900">{application.profile?.phone || 'Unavailable'}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500 mb-0.5">Email</div>
                    <div className="font-semibold text-slate-900">{application.profile?.email || 'Unavailable'}</div>
                  </div>
                </div>

                <ApproveRejectButtons driverProfileId={application.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-base font-semibold text-slate-900 mb-1">No pending verifications</h3>
            <p className="text-sm text-slate-600">All driver applications have been reviewed</p>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-3 text-[10px] uppercase tracking-wide text-slate-500">Vehicle Applications</div>
          {applications.vehicleApplications.length > 0 ? (
            <div className="space-y-3">
              {applications.vehicleApplications.map((vehicle: any) => (
                <div key={vehicle.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="grid grid-cols-1 gap-2 text-sm mb-4">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-500 mb-0.5">Driver</div>
                      <div className="font-semibold text-slate-900">
                        {vehicle.profile ? `${vehicle.profile.first_name || ''} ${vehicle.profile.surname || ''}`.trim() : 'Unavailable'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-500 mb-0.5">Make</div>
                      <div className="font-semibold text-slate-900">{vehicle.make}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-500 mb-0.5">Model</div>
                      <div className="font-semibold text-slate-900">{vehicle.model}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-500 mb-0.5">Colour</div>
                      <div className="font-semibold text-slate-900">{vehicle.colour}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-500 mb-0.5">Licence Plate</div>
                      <div className="font-semibold text-slate-900">{vehicle.licence_plate}</div>
                    </div>
                    {vehicle.year ? (
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-slate-500 mb-0.5">Year</div>
                        <div className="font-semibold text-slate-900">{vehicle.year}</div>
                      </div>
                    ) : null}
                  </div>

                  {vehicle.vehicle_photo_url ? (
                    <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <Image
                        src={vehicle.vehicle_photo_url}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        width={1200}
                        height={800}
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <Car className="h-4 w-4" />
                      Vehicle photo missing
                    </div>
                  )}

                  <VehicleApproveButtons vehicleId={vehicle.id} driverProfileId={vehicle.driverProfileId} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-base font-semibold text-slate-900 mb-1">No pending vehicle applications</h3>
              <p className="text-sm text-slate-600">All submitted vehicles have been reviewed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
