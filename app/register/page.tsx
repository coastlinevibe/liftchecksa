import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RegisterClient from './RegisterClient';

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

    if (profile?.role === 'platform_admin' || profile?.role === 'group_admin') {
      redirect('/admin');
    }

    if (profile?.role === 'driver') {
      redirect('/dashboard/driver');
    }

    redirect('/dashboard/member');
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <RegisterClient />
    </Suspense>
  );
}
