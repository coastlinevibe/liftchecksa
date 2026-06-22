'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateProfileSettings(formData: {
  firstName: string;
  surname: string;
  phone: string;
  homeProvince?: string;
  profilePhoto?: File | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  let profilePhotoUrl: string | null = null;

  if (formData.profilePhoto) {
    const ext = formData.profilePhoto.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/avatar.${ext.toLowerCase()}`;
    const buffer = await formData.profilePhoto.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, buffer, {
        contentType: formData.profilePhoto.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
    profilePhotoUrl = data.publicUrl;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: formData.firstName,
      surname: formData.surname,
      phone: formData.phone,
      home_province: formData.homeProvince || null,
      ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}),
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


