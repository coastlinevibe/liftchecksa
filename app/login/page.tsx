import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginClient from './LoginClient';

function safeRedirectPath(value?: string) {
  if (!value) return '';
  if (!value.startsWith('/')) return '';
  if (value.startsWith('//')) return '';
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = safeRedirectPath(resolvedSearchParams?.redirect) || '';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (redirectTo) {
      redirect(redirectTo);
    }

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

  return <LoginClient redirectTo={redirectTo || undefined} />;
}
