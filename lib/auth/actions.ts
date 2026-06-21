'use server';

import { createClient } from '@/lib/supabase/server';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';

export async function signUp(formData: {
  email: string;
  password: string;
  firstName: string;
  surname: string;
  phone: string;
  role: 'member' | 'driver';
  membershipType: 'basic' | 'plus' | 'provider_monthly' | 'provider_quarterly' | 'provider_annual';
  homeProvince?: string;
  idDocument?: File;
  selfie?: File;
}) {
  const supabase = await createClient();

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Failed to create user' };
  }

  const userId = authData.user.id;
  let idDocumentPath = '';
  let selfieUrl = '';

  // Upload ID document if provided
  if (formData.idDocument) {
    const idExt = formData.idDocument.name.split('.').pop();
    const idPath = `${userId}/id-document.${idExt}`;
    const idBuffer = await formData.idDocument.arrayBuffer();
    
    const { error: idUploadError } = await supabase.storage
      .from('id-documents')
      .upload(idPath, idBuffer, { contentType: formData.idDocument.type });
    
    if (!idUploadError) {
      idDocumentPath = idPath;
    }
  }

  // Upload selfie if provided
  if (formData.selfie) {
    const selfieExt = formData.selfie.name.split('.').pop();
    const selfiePath = `${userId}/selfie.${selfieExt}`;
    const selfieBuffer = await formData.selfie.arrayBuffer();
    
    const { error: selfieUploadError } = await supabase.storage
      .from('profile-photos')
      .upload(selfiePath, selfieBuffer, { contentType: formData.selfie.type });
    
    if (!selfieUploadError) {
      const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(selfiePath);
      selfieUrl = publicUrl;
    }
  }

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    user_id: userId,
    role: formData.role,
    first_name: formData.firstName,
    surname: formData.surname,
    phone: formData.phone,
    email: formData.email,
    membership_type: formData.membershipType,
    membership_status: 'pending',
    home_province: formData.homeProvince,
    id_document_url: idDocumentPath || null,
    profile_photo_url: selfieUrl || null,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  // Generate payment reference
  const prefix = formData.membershipType === 'basic' ? 'LC-M-' : 
                 formData.membershipType === 'plus' ? 'LC-P-' : 
                 formData.membershipType === 'provider_monthly' ? 'LC-D1-' :
                 formData.membershipType === 'provider_quarterly' ? 'LC-D3-' : 'LC-D12-';
  const randomNum = Math.floor(Math.random() * 90000 + 10000);
  const paymentReference = prefix + randomNum;

  // Create payment record
  const amountMap = {
    'basic': 36,
    'plus': 96,
    'provider_monthly': 45,
    'provider_quarterly': 120,
    'provider_annual': 300
  };
  const amount = amountMap[formData.membershipType as keyof typeof amountMap] || 300;

  // If driver, create driver profile
  if (formData.role === 'driver') {
    // Extract plan duration from membership type
    const planMap = {
      'provider_monthly': 'monthly',
      'provider_quarterly': 'quarterly',
      'provider_annual': 'annual'
    };
    const providerPlan = planMap[formData.membershipType as keyof typeof planMap] || 'annual';

    const { error: driverError } = await supabase.from('driver_profiles').insert({
      user_id: userId,
      verification_status: 'pending',
      provider_plan: providerPlan,
      provider_payment_reference: paymentReference,
      provider_payment_amount: amount,
      provider_payment_status: 'pending',
      provider_payment_proof_url: null,
      provider_last_paid_at: null,
      provider_next_payment_at: null,
      id_document_url: idDocumentPath || null,
    });

    if (driverError) {
      return { error: driverError.message };
    }
  }

  await supabase.from('payments').insert({
    user_id: userId,
    plan_type: formData.membershipType,
    amount,
    payment_reference: paymentReference,
    status: 'pending',
  });

  return { success: true, paymentReference };
}

function safeRedirectPath(value?: string) {
  if (!value) return '';
  if (!value.startsWith('/')) return '';
  if (value.startsWith('//')) return '';
  return value;
}

export async function signIn(email: string, password: string, redirectTo?: string) {
  try {
    console.log('[Server] Starting signIn for:', email);
    const supabase = await createClient();
    console.log('[Server] Supabase client created');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('[Server] Auth response:', { data: !!data, error: error?.message });

    if (error) {
      console.error('[Server] Supabase auth error:', error);
      return { error: error.message };
    }

    if (!data.user) {
      console.error('[Server] No user returned');
      return { error: 'Login failed - no user returned' };
    }

  console.log('[Server] User authenticated:', data.user.id);

  // Get user profile to determine role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  console.log('[Server] Profile fetch:', { profile, error: profileError?.message });

  // Drivers should be routed by either their profile role or the presence of a driver profile.
  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, id_status, vehicle_status, verification_status, provider_payment_status')
    .eq('user_id', data.user.id)
    .maybeSingle();

  // Determine redirect URL based on role
  const safeTarget = safeRedirectPath(redirectTo);
  let redirectUrl = safeTarget || '/dashboard';

  if (!safeTarget && (profile?.role === 'driver' || driverProfile)) {
    redirectUrl = '/dashboard/driver';
  } else if (!safeTarget && (isAdminRole(profile?.role) || isSuperAdminEmail(data.user.email))) {
    redirectUrl = '/admin';
  }

    console.log('[Server] Login successful, redirecting to:', redirectUrl);
    return { success: true, redirectUrl };
  } catch (error) {
    console.error('[Server] Unexpected error in signIn:', error);
    return { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)) };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true, redirectUrl: '/' };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return { user, profile };
}
