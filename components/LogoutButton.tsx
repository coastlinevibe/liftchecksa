'use client';

import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const result = await signOut();
    if (result.success) {
      router.push(result.redirectUrl);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 transition-colors"
    >
      <LogOut className="w-4 h-4 text-slate-600" />
      <span className="text-sm font-medium text-slate-700">Log out</span>
    </button>
  );
}
