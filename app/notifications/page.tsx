'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, CheckCircle, AlertTriangle, MessageSquare, Star, MapPin, Clock } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/member" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
            <button className="text-xs text-emerald-600 font-semibold">
              Mark all read
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Today */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Today</h2>
          <div className="space-y-2">
            <div className="bg-white border-l-4 border-emerald-500 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 mb-1">Trip Confirmed</div>
                  <p className="text-xs text-slate-600 mb-2">
                    Your seat for Cape Town → Mthatha on Fri, 16 May has been confirmed by Thabo M.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">2 minutes ago</span>
                    <Link href="/trips/trip-123" className="text-xs text-emerald-600 font-semibold">
                      View Trip
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-blue-500 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 mb-1">New Message</div>
                  <p className="text-xs text-slate-600 mb-2">
                    Thabo M. sent you a message about your upcoming trip
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">15 minutes ago</span>
                    <Link href="/messages/1" className="text-xs text-blue-600 font-semibold">
                      View Message
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-purple-500 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                  <MapPin className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 mb-1">New Trip Available</div>
                  <p className="text-xs text-slate-600 mb-2">
                    A new trip on your saved route Cape Town → Mthatha is available
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">1 hour ago</span>
                    <Link href="/trips" className="text-xs text-purple-600 font-semibold">
                      View Trips
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Yesterday */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Yesterday</h2>
          <div className="space-y-2">
            <div className="bg-white border-l-4 border-yellow-500 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg flex-shrink-0">
                  <Star className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 mb-1">Rate Your Trip</div>
                  <p className="text-xs text-slate-600 mb-2">
                    How was your trip with Sipho N.? Share your experience
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">1 day ago</span>
                    <Link href="/rate/trip-122" className="text-xs text-yellow-600 font-semibold">
                      Rate Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-slate-300 rounded-lg p-3 opacity-60">
              <div className="flex items-start gap-3">
                <div className="bg-slate-100 p-2 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 mb-1">Trip Reminder</div>
                  <p className="text-xs text-slate-600 mb-2">
                    Your trip to George is tomorrow at 14:00. Don't forget!
                  </p>
                  <span className="text-xs text-slate-500">1 day ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-500 mb-2 uppercase">This Week</h2>
          <div className="space-y-2">
            <div className="bg-white border-l-4 border-slate-300 rounded-lg p-3 opacity-60">
              <div className="flex items-start gap-3">
                <div className="bg-slate-100 p-2 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 mb-1">Payment Approved</div>
                  <p className="text-xs text-slate-600 mb-2">
                    Your Member 12 Months membership has been activated
                  </p>
                  <span className="text-xs text-slate-500">3 days ago</span>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-slate-300 rounded-lg p-3 opacity-60">
              <div className="flex items-start gap-3">
                <div className="bg-slate-100 p-2 rounded-lg flex-shrink-0">
                  <Bell className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 mb-1">Welcome to LiftCheck!</div>
                  <p className="text-xs text-slate-600 mb-2">
                    Thanks for joining. Start by finding your first verified lift
                  </p>
                  <span className="text-xs text-slate-500">5 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State (if no notifications) */}
        {/* <div className="text-center py-12">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">No notifications</h3>
          <p className="text-sm text-slate-600">You're all caught up!</p>
        </div> */}
      </div>
    </div>
  );
}
