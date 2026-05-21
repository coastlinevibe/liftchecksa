import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RouteBuilderForm from './RouteBuilderForm';

export default function NewRoutePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/admin/routes" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to routes
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Create Official Route</h1>
          <p className="text-xs text-slate-600">Build the ordered route before assigning any driver.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4">
        <RouteBuilderForm />
      </div>
    </div>
  );
}
