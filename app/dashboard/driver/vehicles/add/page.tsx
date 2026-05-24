'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle, Camera, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AddVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    colour: '',
    licencePlate: '',
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be less than 5MB');
        return;
      }
      setVehiclePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      // Get driver profile ID
      const { data: driverProfile, error: profileError } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !driverProfile) {
        setError('Driver profile not found');
        setLoading(false);
        return;
      }

      let vehiclePhotoUrl = '';

      // Upload vehicle photo if provided
      if (vehiclePhoto) {
        const photoExt = vehiclePhoto.name.split('.').pop();
        const photoPath = `${user.id}/vehicle-${Date.now()}.${photoExt}`;
        const photoBuffer = await vehiclePhoto.arrayBuffer();
        
        const { error: uploadError } = await supabase.storage
          .from('vehicle-photos')
          .upload(photoPath, photoBuffer, { contentType: vehiclePhoto.type });
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('vehicle-photos').getPublicUrl(photoPath);
          vehiclePhotoUrl = publicUrl;
        }
      }

      // Insert vehicle
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert({
          driver_id: driverProfile.id,
          make: formData.make,
          model: formData.model,
          colour: formData.colour,
          licence_plate: formData.licencePlate.toUpperCase(),
          vehicle_photo_url: vehiclePhotoUrl || null,
          verification_status: 'pending',
        });

      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/driver/vehicles');
        }, 2000);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Vehicle Added!</h1>
          <p className="text-sm text-slate-600 mb-4">
            Your vehicle has been submitted for verification
          </p>
          <p className="text-xs text-slate-500">
            Redirecting to vehicles page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/driver/vehicles" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to vehicles
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Add New Vehicle</h1>
          <p className="text-xs text-slate-600">Register a vehicle for your trips</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Vehicle Details</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Make</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Toyota"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Corolla"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Colour</label>
                <input
                  type="text"
                  value={formData.colour}
                  onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                  placeholder="e.g., White"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Licence Plate</label>
                <input
                  type="text"
                  value={formData.licencePlate}
                  onChange={(e) => setFormData({ ...formData, licencePlate: e.target.value.toUpperCase() })}
                  placeholder="e.g., CA 123-456"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">Enter as shown on your licence plate</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vehicle Photo</label>
                <p className="text-xs text-slate-600 mb-2">Clear photo showing licence plate</p>
                {!photoPreview ? (
                  <label className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500">
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} required className="hidden" />
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-semibold">Take or upload photo</p>
                    <p className="text-[10px] text-slate-500 mt-1">JPG or PNG (max 5MB)</p>
                  </label>
                ) : (
                  <div className="relative border-2 border-emerald-500 rounded-lg p-2">
                    <Image
                      src={photoPreview}
                      alt="Vehicle"
                      width={768}
                      height={192}
                      unoptimized
                      className="h-48 w-full rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setVehiclePhoto(null);
                        setPhotoPreview('');
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Verification:</strong> Your vehicle will be reviewed by our admin team within 24-48 hours.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-semibold"
          >
            {loading ? 'Adding Vehicle...' : 'Add Vehicle'}
          </button>
        </form>
      </div>
    </div>
  );
}
