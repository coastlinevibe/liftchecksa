'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Image as ImageIcon, AlertCircle, Shield, Star } from 'lucide-react';

export default function ChatPage() {
  const [message, setMessage] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/member" className="p-1">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900">Thabo M.</span>
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span>4.8 • Verified Driver</span>
              </div>
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Trip Context */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 max-w-md mx-auto w-full">
        <div className="text-xs text-emerald-800">
          <strong>Trip:</strong> Cape Town → Mthatha • Fri, 16 May • 16:00
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full">
        <div className="space-y-3">
          {/* Date Separator */}
          <div className="flex items-center justify-center">
            <div className="bg-slate-200 px-3 py-1 rounded-full text-xs text-slate-600">
              Today
            </div>
          </div>

          {/* Received Message */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none p-3 max-w-[80%]">
                <p className="text-sm text-slate-900">
                  Hi! Thanks for booking. I'll be at the pickup point at 15:50.
                </p>
              </div>
              <div className="text-xs text-slate-500 mt-1 ml-1">10:23 AM</div>
            </div>
          </div>

          {/* Sent Message */}
          <div className="flex items-start gap-2 justify-end">
            <div className="flex-1 flex flex-col items-end">
              <div className="bg-emerald-500 rounded-lg rounded-tr-none p-3 max-w-[80%]">
                <p className="text-sm text-white">
                  Perfect! I'll be there on time. What does your car look like?
                </p>
              </div>
              <div className="text-xs text-slate-500 mt-1 mr-1">10:25 AM</div>
            </div>
          </div>

          {/* Received Message with Image */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none p-2 max-w-[80%]">
                <div className="w-full h-32 bg-slate-200 rounded-lg mb-2 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-900">
                  White Toyota Corolla, plate CA 123-456
                </p>
              </div>
              <div className="text-xs text-slate-500 mt-1 ml-1">10:27 AM</div>
            </div>
          </div>

          {/* Sent Message */}
          <div className="flex items-start gap-2 justify-end">
            <div className="flex-1 flex flex-col items-end">
              <div className="bg-emerald-500 rounded-lg rounded-tr-none p-3 max-w-[80%]">
                <p className="text-sm text-white">
                  Great, thanks! See you tomorrow 👍
                </p>
              </div>
              <div className="text-xs text-slate-500 mt-1 mr-1">10:28 AM</div>
            </div>
          </div>

          {/* System Message */}
          <div className="flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 max-w-[90%]">
              <p className="text-xs text-blue-800 text-center">
                <strong>Reminder:</strong> Use Match Check to verify the driver before getting in
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 max-w-md mx-auto w-full">
        <div className="flex items-end gap-2">
          <button className="p-2.5 hover:bg-slate-100 rounded-lg flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>
          <button className="p-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg flex-shrink-0">
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
