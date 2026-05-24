'use client';

import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthPromptProps {
  message?: string;
  returnUrl?: string;
}

export default function AuthPrompt({ 
  message = "Sign up or log in to continue", 
  returnUrl 
}: AuthPromptProps) {
  const redirectParam = returnUrl ? `?redirect=${encodeURIComponent(returnUrl)}` : '';
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Join LiftCheck S.A</h2>
          <p className="text-sm text-slate-600">{message}</p>
        </div>

        <div className="space-y-3">
          <Link 
            href={`/register${redirectParam}`}
            className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold text-center"
          >
            Create Account
          </Link>
          <Link 
            href={`/login${redirectParam}`}
            className="block w-full bg-white border-2 border-slate-200 hover:border-emerald-500 text-slate-900 py-3 rounded-lg text-sm font-semibold text-center flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Log In
          </Link>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          Browse trips freely. Sign up only when you&apos;re ready to book.
        </p>
      </div>
    </div>
  );
}
