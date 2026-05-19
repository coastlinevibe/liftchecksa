'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthPrompt from '@/components/AuthPrompt';

export default function TripActions({
  tripId,
  isAuthenticated,
}: {
  tripId: string;
  isAuthenticated: boolean;
}) {
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  function handleInteraction() {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
  }

  return (
    <>
      {showAuthPrompt && (
        <AuthPrompt
          message="Sign up to request a seat"
          returnUrl={`/trips/${tripId}`}
        />
      )}

      <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 -mx-4">
        <div className="max-w-md mx-auto space-y-2">
          {isAuthenticated ? (
            <Link
              href={`/trips/${tripId}/book`}
              className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold text-center"
            >
              Book a seat
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => handleInteraction()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold"
            >
              Book a seat
            </button>
          )}
        </div>
      </div>
    </>
  );
}
