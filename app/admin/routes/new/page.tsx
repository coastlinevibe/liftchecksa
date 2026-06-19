import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RouteBuilderForm from './RouteBuilderForm';

export default function NewRoutePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/admin" className="inline-flex items-center text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to admin
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/admin/routes" className="inline-flex items-center text-slate-600 hover:text-slate-900">
              Routes
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Create Official Route</h1>
          <p className="text-xs text-slate-600">Build the ordered route before reviewing any driver application.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4">
        <RouteBuilderForm />
      </div>
    </div>
  );
}
