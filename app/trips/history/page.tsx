'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Star, Download, MessageSquare, AlertCircle } from 'lucide-react';

export default function TripHistoryPage() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/member" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">My Trips</h1>
          <p className="text-xs text-slate-600">Your travel history</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === 'completed'
                ? 'bg-emerald-500 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === 'cancelled'
                ? 'bg-emerald-500 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Cancelled
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">12</div>
            <div className="text-xs text-slate-600">Total Trips</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">4.8</div>
            <div className="text-xs text-slate-600">Avg Rating</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">R4.2K</div>
            <div className="text-xs text-slate-600">Total Spent</div>
          </div>
        </div>

        {/* Trip List */}
        <div className="space-y-3">
          {/* Completed Trip */}
          <TripHistoryCard
            route="Cape Town → George"
            date="Wed, 14 May 2026"
            driver="Thabo M."
            driverRating={4.8}
            amount="R300"
            status="completed"
            rated={true}
            myRating={5}
          />

          <TripHistoryCard
            route="George → Cape Town"
            date="Sun, 11 May 2026"
            driver="Sipho N."
            driverRating={5.0}
            amount="R300"
            status="completed"
            rated={true}
            myRating={5}
          />

          <TripHistoryCard
            route="Cape Town → Mthatha"
            date="Fri, 2 May 2026"
            driver="Zanele P."
            driverRating={4.9}
            amount="R350"
            status="completed"
            rated={false}
          />

          {/* Cancelled Trip */}
          {(filter === 'all' || filter === 'cancelled') && (
            <TripHistoryCard
              route="Cape Town → Durban"
              date="Mon, 28 Apr 2026"
              driver="John D."
              driverRating={3.5}
              amount="R450"
              status="cancelled"
              cancelReason="Driver cancelled - vehicle breakdown"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TripHistoryCard({
  route,
  date,
  driver,
  driverRating,
  amount,
  status,
  rated,
  myRating,
  cancelReason,
}: {
  route: string;
  date: string;
  driver: string;
  driverRating: number;
  amount: string;
  status: 'completed' | 'cancelled';
  rated?: boolean;
  myRating?: number;
  cancelReason?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${
      status === 'cancelled' ? 'border-red-200 opacity-60' : 'border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-slate-900">{route}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
            <Calendar className="w-3 h-3" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">Driver:</span>
            <span className="font-semibold text-slate-900">{driver}</span>
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-slate-600">{driverRating}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">{amount}</div>
          {status === 'completed' && (
            <div className="text-xs text-emerald-600">Completed</div>
          )}
          {status === 'cancelled' && (
            <div className="text-xs text-red-600">Cancelled</div>
          )}
        </div>
      </div>

      {cancelReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
          <div className="flex gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">{cancelReason}</p>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex gap-2">
          {rated ? (
            <div className="flex-1 bg-slate-50 rounded-lg p-2 flex items-center justify-center gap-1">
              <span className="text-xs text-slate-600">You rated:</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < (myRating || 0)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Link
              href={`/rate/trip-${Math.random()}`}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-semibold text-center"
            >
              Rate Trip
            </Link>
          )}
          <button className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Download className="w-3 h-3" />
            Receipt
          </button>
          <Link
            href="/messages/1"
            className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <MessageSquare className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
