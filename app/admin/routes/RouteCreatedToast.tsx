'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function RouteCreatedToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldShow = searchParams.get('route_created') === '1';
  const [open, setOpen] = useState(shouldShow);

  useEffect(() => {
    if (!shouldShow || !open) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(false);
      router.replace(pathname, { scroll: false });
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [open, pathname, router, shouldShow]);

  if (!open) {
    return null;
  }

  const closeToast = () => {
    setOpen(false);
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(24rem,calc(100vw-1.5rem))]">
      <div className="rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Route ready to go!</p>
            <p className="mt-1 text-sm text-slate-600">
              The route has been created and is ready for review.
            </p>
            <Link
              href="/admin/routes"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              View routes
            </Link>
          </div>
          <button
            type="button"
            onClick={closeToast}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss route created notification"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
