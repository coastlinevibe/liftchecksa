'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateProfileSettings(formData: {
  firstName: string;
  surname: string;
  phone: string;
  homeProvince?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: formData.firstName,
      surname: formData.surname,
      phone: formData.phone,
      home_province: formData.homeProvince || null,
    })
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/settings/profile');
  revalidatePath('/dashboard/member');
  revalidatePath('/dashboard/driver');

  return { success: true };
}
