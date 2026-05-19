'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Star, Shield, MapPin, Calendar } from 'lucide-react';

export default function TripRequestsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/driver" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Trip Requests</h1>
          <p className="text-xs text-slate-600">Cape Town → Mthatha • Fri, 16 May</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Trip Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 mb-1">Seats Status</div>
              <div className="text-xs text-slate-600">2 of 3 seats booked</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-600">R350</div>
              <div className="text-xs text-slate-500">per seat</div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Cape Town CBD → Mthatha Plaza</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5" />
              <span>Fri, 16 May • 16:00</span>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Pending Requests (2)</h2>
          <div className="space-y-3">
            <RequestCard
              name="Nomsa K."
              rating={4.8}
              trips={12}
              verified={true}
              message="Hi! I need a lift to Mthatha. Can I bring one medium bag?"
              requestedAt="2 hours ago"
              status="pending"
            />

            <RequestCard
              name="Sipho M."
              rating={5.0}
              trips={8}
              verified={true}
              message="Hello, is the pickup point flexible? I'm near Bellville."
              requestedAt="5 hours ago"
              status="pending"
            />
          </div>
        </div>

        {/* Accepted Requests */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Accepted (2)</h2>
          <div className="space-y-3">
            <RequestCard
              name="Zanele P."
              rating={4.9}
              trips={15}
              verified={true}
              message="Thanks for accepting! See you on Friday."
              requestedAt="1 day ago"
              status="accepted"
            />

            <RequestCard
              name="Mandla K."
              rating={4.7}
              trips={6}
              verified={true}
              message="Great! I'll be there on time."
              requestedAt="1 day ago"
              status="accepted"
            />
          </div>
        </div>

        {/* Rejected Requests */}
        {/* <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Rejected (1)</h2>
          <div className="space-y-3">
            <RequestCard
              name="John D."
              rating={3.2}
              trips={2}
              verified={false}
              message="Need a lift urgently"
              requestedAt="2 days ago"
              status="rejected"
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}

function RequestCard({
  name,
  rating,
  trips,
  verified,
  message,
  requestedAt,
  status,
}: {
  name: string;
  rating: number;
  trips: number;
  verified: boolean;
  message: string;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}) {
  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${
      status === 'accepted' ? 'border-emerald-300 bg-emerald-50/30' :
      status === 'rejected' ? 'border-red-300 bg-red-50/30 opacity-60' :
      'border-slate-200'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-bold text-slate-900">{name}</span>
            {verified && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span>{rating}</span>
            </div>
            <span>•</span>
            <span>{trips} trips</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 mb-2">
            <p className="text-xs text-slate-700">{message}</p>
          </div>
          <div className="text-xs text-slate-500">{requestedAt}</div>
        </div>
      </div>

      {/* Actions */}
      {status === 'pending' && (
        <div className="flex gap-2">
          <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Accept
          </button>
          <button className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Accepted</span>
          </div>
          <Link
            href="/messages/1"
            className="px-4 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </Link>
        </div>
      )}

      {status === 'rejected' && (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">Rejected</span>
        </div>
      )}
    </div>
  );
}
