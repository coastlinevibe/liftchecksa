import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: roleProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (isAdminRole(roleProfile?.role) || isSuperAdminEmail(user.email)) {
    redirect('/admin');
  }

  if (roleProfile?.role === 'driver' || driverProfile) {
    redirect('/dashboard/driver');
  }

  redirect('/dashboard/member');
}

