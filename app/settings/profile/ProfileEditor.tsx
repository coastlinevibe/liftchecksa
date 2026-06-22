'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera } from 'lucide-react';
import ProfileAvatar from '@/components/ProfileAvatar';
import { updateProfileSettings } from '@/lib/settings/actions';

type Props = {
  firstName: string;
  surname: string;
  phone: string;
  homeProvince: string;
  roleLabel: string;
  email: string;
  profilePhotoUrl?: string | null;
};

export default function ProfileEditor({
  firstName,
  surname,
  phone,
  homeProvince,
  roleLabel,
  email,
  profilePhotoUrl,
}: Props) {
  const [form, setForm] = useState({
    firstName,
    surname,
    phone,
    homeProvince,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(profilePhotoUrl || '');

  const displayName = useMemo(
    () => `${form.firstName} ${form.surname}`.trim() || email,
    [form.firstName, form.surname, email]
  );

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProfilePhoto(file);

    if (!file) {
      setPhotoPreview(profilePhotoUrl || '');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await updateProfileSettings({
      ...form,
      profilePhoto,
    });

    if (result?.error) {
      setError(result.error);
    } else {
      setMessage('Profile updated successfully.');
      setProfilePhoto(null);
    }

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="mb-4">
        <div className="text-sm font-bold text-slate-900 mb-1">Profile Details</div>
        <div className="text-xs text-slate-600">{roleLabel}</div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Profile Avatar</label>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="relative">
              <ProfileAvatar name={displayName} photoUrl={photoPreview} size={56} className="shrink-0" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-slate-600 shadow-sm">
                <Camera className="h-3 w-3" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">
                Choose photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                JPG, PNG or WebP. This avatar is shown on your driver and passenger profile cards.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
          <input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Surname</label>
          <input
            value={form.surname}
            onChange={(e) => setForm({ ...form, surname: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Home Province</label>
          <select
            value={form.homeProvince}
            onChange={(e) => setForm({ ...form, homeProvince: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select province</option>
            <option value="WC">Western Cape</option>
            <option value="EC">Eastern Cape</option>
            <option value="GP">Gauteng</option>
            <option value="KZN">KwaZulu-Natal</option>
            <option value="LP">Limpopo</option>
            <option value="MP">Mpumalanga</option>
            <option value="NC">Northern Cape</option>
            <option value="NW">North West</option>
            <option value="FS">Free State</option>
          </select>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          <div className="font-semibold text-slate-900 mb-1">Email</div>
          <div>{email}</div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
