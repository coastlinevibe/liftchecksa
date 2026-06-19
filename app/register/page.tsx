import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RegisterClient from './RegisterClient';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (isAdminRole(profile?.role) || isSuperAdminEmail(user.email)) {
      redirect('/admin');
    }

    if (profile?.role === 'driver') {
      redirect('/dashboard/driver');
    }

    redirect('/dashboard');
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <RegisterClient />
    </Suspense>
  );
}
