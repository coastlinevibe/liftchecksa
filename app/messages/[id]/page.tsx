'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Image as ImageIcon, AlertCircle, Shield, Star } from 'lucide-react';

export default function MessagePage() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/member" className="p-1">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900">Thabo M.</span>
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span>4.8 • Verified Driver</span>
              </div>
            </div>
            <button className="rounded-lg p-2 hover:bg-slate-100">
              <AlertCircle className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md border-b border-emerald-200 bg-emerald-50 px-4 py-2">
        <div className="text-xs text-emerald-800">
          <strong>Route:</strong> Cape Town → Mthatha • Fri, 16 May • 16:00
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">Today</div>
          </div>

          <div className="flex items-start gap-2">
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <div className="flex-1">
              <div className="max-w-[80%] rounded-lg rounded-tl-none border border-slate-200 bg-white p-3">
                <p className="text-sm text-slate-900">
                  Hi. Thanks for the route request. I&apos;ll be at the pickup point at 15:50.
                </p>
              </div>
              <div className="ml-1 mt-1 text-xs text-slate-500">10:23 AM</div>
            </div>
          </div>

          <div className="flex items-start justify-end gap-2">
            <div className="flex flex-1 flex-col items-end">
              <div className="max-w-[80%] rounded-lg rounded-tr-none bg-emerald-500 p-3">
                <p className="text-sm text-white">
                  Perfect. I&apos;ll be there on time. What does your car look like?
                </p>
              </div>
              <div className="mr-1 mt-1 text-xs text-slate-500">10:25 AM</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <div className="flex-1">
              <div className="max-w-[80%] rounded-lg rounded-tl-none border border-slate-200 bg-white p-2">
                <div className="mb-2 flex h-32 w-full items-center justify-center rounded-lg bg-slate-200">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-900">White Toyota Corolla, plate CA 123-456</p>
              </div>
              <div className="ml-1 mt-1 text-xs text-slate-500">10:27 AM</div>
            </div>
          </div>

          <div className="flex items-start justify-end gap-2">
            <div className="flex flex-1 flex-col items-end">
              <div className="max-w-[80%] rounded-lg rounded-tr-none bg-emerald-500 p-3">
                <p className="text-sm text-white">Great, thanks. See you tomorrow.</p>
              </div>
              <div className="mr-1 mt-1 text-xs text-slate-500">10:28 AM</div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="max-w-[90%] rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-center text-xs text-blue-800">
                <strong>Reminder:</strong> Use Match Check to verify the driver before getting in
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <button className="flex-shrink-0 rounded-lg p-2.5 hover:bg-slate-100">
            <ImageIcon className="h-5 w-5 text-slate-600" />
          </button>
          <div className="relative flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>
          <button className="flex-shrink-0 rounded-lg bg-emerald-500 p-2.5 hover:bg-emerald-600">
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
