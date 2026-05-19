import Link from 'next/link';
import { ArrowLeft, Plus, Car, CheckCircle, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

async function getDriverVehicles() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get driver profile ID first
  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!driverProfile) {
    return [];
  }

  // Query vehicles using driver_profile.id
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('driver_id', driverProfile.id)
    .order('created_at', { ascending: false });

  return vehicles || [];
}

export default async function VehiclesPage() {
  const vehicles = await getDriverVehicles();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/driver" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900">My Vehicles</h1>
          <p className="text-xs text-slate-600">Manage your registered vehicles</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Add Vehicle Button */}
        <Link
          href="/dashboard/driver/vehicles/add"
          className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold mb-4 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Vehicle
        </Link>

        {/* Vehicles List */}
        {vehicles.length > 0 ? (
          <div className="space-y-3">
            {vehicles.map((vehicle: any) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">No vehicles yet</h3>
            <p className="text-xs text-slate-600">Use the Add New Vehicle button above to start offering trips</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-blue-900 mb-2">Vehicle Requirements</h3>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>• Valid vehicle registration</li>
            <li>• Current licence disc</li>
            <li>• Clear photos of vehicle</li>
            <li>• Roadworthy condition</li>
            <li>• Matching licence plate</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ vehicle }: { vehicle: any }) {
  const statusConfig = {
    approved: {
      color: 'border-emerald-300',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-900',
      subTextColor: 'text-emerald-700',
      icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
      label: 'Verified',
      description: 'Ready to use for trips'
    },
    pending: {
      color: 'border-amber-300',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-900',
      subTextColor: 'text-amber-700',
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      label: 'Pending Verification',
      description: 'Under review by admin'
    },
    rejected: {
      color: 'border-red-300',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      subTextColor: 'text-red-700',
      icon: <XCircle className="w-4 h-4 text-red-600" />,
      label: 'Verification Failed',
      description: 'Documents need to be updated'
    }
  };

  const config = statusConfig[vehicle.verification_status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${config.color}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="bg-slate-100 p-3 rounded-lg">
          <Car className="w-6 h-6 text-slate-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-slate-900">
              {vehicle.make} {vehicle.model}
            </span>
            {vehicle.verification_status === 'approved' && (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>
              <span className="text-slate-600">Colour:</span>
              <span className="font-semibold text-slate-900 ml-1">{vehicle.colour}</span>
            </div>
          </div>
          <div className="bg-slate-900 text-white px-3 py-1 rounded text-center text-sm font-bold inline-block">
            {vehicle.licence_plate}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-2 flex items-center gap-2`}>
        {config.icon}
        <div>
          <div className={`text-xs font-semibold ${config.textColor}`}>{config.label}</div>
          <div className={`text-xs ${config.subTextColor}`}>{config.description}</div>
        </div>
      </div>
    </div>
  );
}
