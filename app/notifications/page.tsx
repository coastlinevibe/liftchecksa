'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, CheckCircle, MessageSquare, Star, MapPin, Clock } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-md px-4 py-4">
          <Link href="/dashboard/member" className="mb-2 inline-flex items-center text-sm text-slate-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
            <button className="text-xs font-semibold text-emerald-600">Mark all read</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Today</h2>
          <div className="space-y-2">
            <div className="rounded-lg border-l-4 border-emerald-500 bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-emerald-100 p-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-900">Route Seat Confirmed</div>
                  <p className="mb-2 text-xs text-slate-600">
                    Your seat on Cape Town → Mthatha for Fri, 16 May has been confirmed by Thabo M.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">2 minutes ago</span>
                    <Link href="/routes" className="text-xs font-semibold text-emerald-600">
                      View Routes
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-l-4 border-blue-500 bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-900">Route Message</div>
                  <p className="mb-2 text-xs text-slate-600">Thabo M. sent you a message about your route request</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">15 minutes ago</span>
                    <Link href="/messages/1" className="text-xs font-semibold text-blue-600">
                      View Message
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-l-4 border-purple-500 bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-purple-100 p-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-900">New Route Available</div>
                  <p className="mb-2 text-xs text-slate-600">
                    A new route on your saved corridor Cape Town → Mthatha is available
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">1 hour ago</span>
                    <Link href="/routes" className="text-xs font-semibold text-purple-600">
                      View Routes
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Yesterday</h2>
          <div className="space-y-2">
            <div className="rounded-lg border-l-4 border-yellow-500 bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-yellow-100 p-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-900">Share Route Feedback</div>
                  <p className="mb-2 text-xs text-slate-600">How was your route with Sipho N.? Share your experience</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">1 day ago</span>
                    <Link href="/routes" className="text-xs font-semibold text-yellow-600">
                      View Routes
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-l-4 border-slate-300 bg-white p-3 opacity-60">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-slate-100 p-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-900">Route Reminder</div>
                  <p className="mb-2 text-xs text-slate-600">Your route to George is tomorrow at 14:00. Don&apos;t forget!</p>
                  <span className="text-xs text-slate-500">1 day ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">This Week</h2>
          <div className="space-y-2">
            <div className="rounded-lg border-l-4 border-slate-300 bg-white p-3 opacity-60">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-slate-100 p-2">
                  <CheckCircle className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-900">Payment Approved</div>
                  <p className="mb-2 text-xs text-slate-600">Your Member 12 Months membership has been activated</p>
                  <span className="text-xs text-slate-500">3 days ago</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-l-4 border-slate-300 bg-white p-3 opacity-60">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-slate-100 p-2">
                  <Bell className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-900">Welcome to LiftCheck!</div>
                  <p className="mb-2 text-xs text-slate-600">Thanks for joining. Start by finding your first verified route</p>
                  <span className="text-xs text-slate-500">5 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
