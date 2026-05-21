import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, User, FileText, Camera, AlertCircle, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { resolveSignedStorageUrl } from '@/lib/supabase/storage';
import { notFound } from 'next/navigation';
import ApproveRejectButtons from './ApproveRejectButtons';
import VehicleApproveButtons from './VehicleApproveButtons';
import CollapsibleImage from './CollapsibleImage';
import VehiclePhoto from './VehiclePhoto';

async function getVerificationData(id: string) {
  const supabase = await createClient();

  // Get driver profile
  const { data: driverProfile, error } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !driverProfile) {
    return null;
  }

  // Get profile separately
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, surname, phone, email, profile_photo_url, id_document_url, home_province')
    .eq('user_id', driverProfile.user_id)
    .maybeSingle();

  // Get signed URLs for images (valid for 1 hour)
  let signedSelfieUrl = profile?.profile_photo_url;
  let signedIdDocUrl = profile?.id_document_url || driverProfile.id_document_url;

  if (profile?.profile_photo_url) {
    const path = profile.profile_photo_url.split('/profile-photos/')[1];
    if (path) {
      const { data: signedData } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(path, 3600);
      if (signedData) signedSelfieUrl = signedData.signedUrl;
    }
  }

  if (signedIdDocUrl) {
    const path = signedIdDocUrl.split('/id-documents/')[1];
    if (path) {
      const { data: signedData } = await supabase.storage
        .from('id-documents')
        .createSignedUrl(path, 3600);
      if (signedData) signedIdDocUrl = signedData.signedUrl;
    }
  }

  // Get payment info
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', driverProfile.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get signed URL for payment proof if exists
  const proofSource = payment?.proof_url || payment?.proof_image;
  const signedPaymentProofUrl = await resolveSignedStorageUrl(
    supabase,
    'payment-proofs',
    proofSource
  );

  // Get vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('driver_id', driverProfile.id)
    .order('created_at', { ascending: false });

  // Get signed URLs for vehicle photos
  const vehiclesWithSignedUrls = await Promise.all((vehicles || []).map(async (vehicle: any) => {
    let signedVehiclePhotoUrl = vehicle.vehicle_photo_url;
    if (vehicle.vehicle_photo_url) {
      const path = vehicle.vehicle_photo_url.split('/vehicle-photos/')[1];
      if (path) {
        const { data: signedData } = await supabase.storage
          .from('vehicle-photos')
          .createSignedUrl(path, 3600);
        if (signedData) signedVehiclePhotoUrl = signedData.signedUrl;
      }
    }
    return { ...vehicle, vehicle_photo_url: signedVehiclePhotoUrl };
  }));

  return { 
    driverProfile: { 
      ...driverProfile, 
      profiles: {
        ...(profile || {}),
        profile_photo_url: signedSelfieUrl,
        id_document_url: signedIdDocUrl
      }
    }, 
    payment: payment ? { ...payment, proof_url: signedPaymentProofUrl } : null, 
    vehicles: vehiclesWithSignedUrls 
  };
}

export default async function VerificationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getVerificationData(id);

  if (!data) {
    notFound();
  }

  const { driverProfile, payment, vehicles } = data;
  const profile = driverProfile.profiles;
  const idDocUrl = profile?.id_document_url || driverProfile.id_document_url;
  const selfieUrl = profile?.profile_photo_url;

  // Validate URLs
  const isValidUrl = (url: string | null | undefined) => {
    return url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
  };

  const validSelfieUrl = isValidUrl(selfieUrl) ? selfieUrl : null;
  const validIdDocUrl = isValidUrl(idDocUrl) ? idDocUrl : null;
  const validPaymentProofUrl = (payment?.proof_url || payment?.proof_image) && isValidUrl(payment?.proof_url || payment?.proof_image)
    ? (payment?.proof_url || payment?.proof_image)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <Link href="/admin" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to admin
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Driver Verification Review</h1>
          <p className="text-xs text-slate-600">Application ID: {driverProfile.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto">
        {/* Applicant Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Applicant Information</h2>
          <div className="flex items-start gap-4 mb-4">
            {validSelfieUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-200">
                <Image src={validSelfieUrl} alt="Selfie" width={64} height={64} className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-lg font-bold text-slate-900 mb-1">
                {profile?.first_name || profile?.surname
                  ? `${profile?.first_name || ''} ${profile?.surname || ''}`.trim()
                  : 'Profile missing'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-600">Phone:</span>
                  <span className="font-semibold text-slate-900 ml-1">{profile?.phone || 'Unavailable'}</span>
                </div>
                <div>
                  <span className="text-slate-600">Email:</span>
                  <span className="font-semibold text-slate-900 ml-1">{profile?.email || 'Unavailable'}</span>
                </div>
                {profile?.home_province && (
                  <div>
                    <span className="text-slate-600">Province:</span>
                    <span className="font-semibold text-slate-900 ml-1">{profile.home_province}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-600">Applied:</span>
                  <span className="font-semibold text-slate-900 ml-1">
                    {new Date(driverProfile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {!profile ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This driver application is missing its linked profile row. Review the application carefully before taking action.
            </div>
          ) : null}
        </div>

        {/* Selfie */}
        <CollapsibleImage
          title="Selfie / Profile Photo"
          icon={<Camera className="w-5 h-5 text-slate-600" />}
          imageUrl={validSelfieUrl}
          altText="Selfie"
          width={400}
          height={400}
          className="w-full max-w-sm mx-auto rounded-lg"
        />

        {/* ID Document */}
        <CollapsibleImage
          title="ID Document"
          icon={<FileText className="w-5 h-5 text-slate-600" />}
          imageUrl={validIdDocUrl}
          altText="ID Document"
          width={600}
          height={400}
          className="w-full rounded-lg"
        />

        {/* Payment Info */}
        {payment && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Payment Information</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-xs text-slate-600 mb-0.5">Reference</div>
                <div className="font-semibold text-slate-900">{payment.payment_reference}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-xs text-slate-600 mb-0.5">Amount</div>
                <div className="font-semibold text-slate-900">R{payment.amount}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-xs text-slate-600 mb-0.5">Status</div>
                <div className={`font-semibold ${
                  payment.status === 'approved' ? 'text-emerald-600' : 
                  payment.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {payment.status}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-xs text-slate-600 mb-0.5">Plan</div>
                <div className="font-semibold text-slate-900">{payment.plan_type}</div>
              </div>
            </div>
            {payment.proof_url && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ✓ Payment proof uploaded. Review payment proof on the <Link href="/admin/payments" className="font-semibold underline">Payments page</Link>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Approve/Reject Section */}
        <ApproveRejectButtons 
          driverProfileId={driverProfile.id}
          userId={driverProfile.user_id}
          paymentId={payment?.id}
        />

        {/* Vehicles Section */}
        {vehicles.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">Vehicles ({vehicles.length})</h2>
            </div>
            
            {vehicles.map((vehicle: any) => (
              <div key={vehicle.id} className="mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0">
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-xs text-slate-600 mb-0.5">Make & Model</div>
                    <div className="font-semibold text-slate-900">{vehicle.make} {vehicle.model}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-xs text-slate-600 mb-0.5">Colour</div>
                    <div className="font-semibold text-slate-900">{vehicle.colour}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-xs text-slate-600 mb-0.5">Licence Plate</div>
                    <div className="font-semibold text-slate-900">{vehicle.licence_plate}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-xs text-slate-600 mb-0.5">Status</div>
                    <div className={`font-semibold ${
                      vehicle.verification_status === 'approved' ? 'text-emerald-600' :
                      vehicle.verification_status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {vehicle.verification_status}
                    </div>
                  </div>
                </div>

                {vehicle.vehicle_photo_url && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Vehicle Photo</div>
                    <VehiclePhoto photoUrl={vehicle.vehicle_photo_url} />
                  </div>
                )}

                {vehicle.verification_status === 'pending' && (
                  <VehicleApproveButtons vehicleId={vehicle.id} driverProfileId={driverProfile.id} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-amber-900 mb-1">Verification Checklist</div>
              <ul className="text-xs text-amber-800 space-y-0.5">
                <li>• <strong>First:</strong> Review payment proof on the <Link href="/admin/payments" className="underline font-semibold">Payments page</Link></li>
                <li>• ID document is clear and readable</li>
                <li>• Selfie matches ID photo</li>
                <li>• All information appears legitimate</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
