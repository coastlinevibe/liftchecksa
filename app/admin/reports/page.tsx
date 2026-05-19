'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Search, Eye, Ban, CheckCircle, MessageSquare } from 'lucide-react';

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<'all' | 'new' | 'under_review' | 'resolved'>('new');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <Link href="/admin" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to admin
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mb-3">Reports Management</h1>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('new')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                filter === 'new'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              New (3)
            </button>
            <button
              onClick={() => setFilter('under_review')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                filter === 'under_review'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Under Review (5)
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                filter === 'resolved'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-6xl mx-auto">
        {/* New Reports */}
        {filter === 'new' && (
          <div className="space-y-3">
            <ReportCard
              id="REP-123"
              type="Fake driver profile"
              severity="high"
              reportedUser="John Doe"
              reportedBy="Nomsa K."
              description="Driver didn't show up, blocked after payment. Suspected scammer."
              submittedAt="1 hour ago"
              status="new"
            />

            <ReportCard
              id="REP-124"
              type="Wrong vehicle"
              severity="medium"
              reportedUser="Thabo M."
              reportedBy="Sipho N."
              description="Vehicle plate didn't match profile. Different car showed up."
              submittedAt="3 hours ago"
              status="new"
            />

            <ReportCard
              id="REP-125"
              type="Unsafe driving"
              severity="high"
              reportedUser="Peter S."
              reportedBy="Zanele P."
              description="Driver was speeding and driving recklessly on the highway."
              submittedAt="5 hours ago"
              status="new"
            />
          </div>
        )}

        {/* Under Review */}
        {filter === 'under_review' && (
          <div className="space-y-3">
            <ReportCard
              id="REP-120"
              type="Overcharging"
              severity="low"
              reportedUser="Mike K."
              reportedBy="Linda M."
              description="Charged R50 more than agreed price."
              submittedAt="1 day ago"
              status="under_review"
              reviewedBy="Admin User"
            />
          </div>
        )}

        {/* Resolved */}
        {filter === 'resolved' && (
          <div className="space-y-3">
            <ReportCard
              id="REP-115"
              type="Fake driver profile"
              severity="high"
              reportedUser="Scammer X"
              reportedBy="Multiple Users"
              description="Multiple reports of fake profile and payment fraud."
              submittedAt="3 days ago"
              status="resolved"
              reviewedBy="Admin User"
              resolution="User banned permanently"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({
  id,
  type,
  severity,
  reportedUser,
  reportedBy,
  description,
  submittedAt,
  status,
  reviewedBy,
  resolution,
}: {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  reportedUser: string;
  reportedBy: string;
  description: string;
  submittedAt: string;
  status: 'new' | 'under_review' | 'resolved';
  reviewedBy?: string;
  resolution?: string;
}) {
  const severityColors = {
    low: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    medium: 'bg-orange-100 text-orange-700 border-orange-300',
    high: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${
      severity === 'high' ? 'border-red-300' : 
      severity === 'medium' ? 'border-orange-300' : 
      'border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-5 h-5 ${
              severity === 'high' ? 'text-red-600' :
              severity === 'medium' ? 'text-orange-600' :
              'text-yellow-600'
            }`} />
            <span className="text-base font-bold text-slate-900">{type}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityColors[severity]}`}>
              {severity.toUpperCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <span className="text-slate-600">Report ID:</span>
              <span className="font-semibold text-slate-900 ml-1">{id}</span>
            </div>
            <div>
              <span className="text-slate-600">Submitted:</span>
              <span className="font-semibold text-slate-900 ml-1">{submittedAt}</span>
            </div>
            <div>
              <span className="text-slate-600">Reported User:</span>
              <span className="font-semibold text-red-600 ml-1">{reportedUser}</span>
            </div>
            <div>
              <span className="text-slate-600">Reported By:</span>
              <span className="font-semibold text-slate-900 ml-1">{reportedBy}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-slate-700 mb-1">Description</div>
            <p className="text-sm text-slate-900">{description}</p>
          </div>

          {resolution && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
              <div className="text-xs font-semibold text-emerald-900 mb-1">Resolution</div>
              <p className="text-sm text-emerald-800">{resolution}</p>
              {reviewedBy && (
                <div className="text-xs text-emerald-700 mt-1">
                  Resolved by <span className="font-semibold">{reviewedBy}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {status === 'new' && (
        <div className="flex gap-2">
          <Link
            href={`/admin/reports/${id}`}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Review Details
          </Link>
          <button className="px-4 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            <Ban className="w-4 h-4" />
            Suspend
          </button>
        </div>
      )}

      {status === 'under_review' && (
        <div className="flex gap-2">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Mark Resolved
          </button>
          <button className="px-4 bg-slate-500 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Add Note
          </button>
        </div>
      )}

      {status === 'resolved' && (
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">Resolved</span>
        </div>
      )}
    </div>
  );
}
