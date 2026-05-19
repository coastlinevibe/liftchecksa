'use client';

import Link from 'next/link';
import { ArrowLeft, Download, CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';

export default function PaymentHistoryPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/settings" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Payment History</h1>
          <p className="text-xs text-slate-600">Your membership payments</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Current Membership */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 mb-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs opacity-75 mb-1">Current Plan</div>
              <div className="text-lg font-bold">Member Plus</div>
            </div>
            <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">
              Active
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-90">Expires</span>
            <span className="font-semibold">13 May 2027</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link
            href="/payment/renew"
            className="bg-white border border-slate-200 rounded-lg p-3 text-center hover:border-emerald-500 transition-all"
          >
            <CreditCard className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-xs font-semibold text-slate-900">Renew Early</div>
          </Link>
          <Link
            href="/payment/upgrade"
            className="bg-white border border-slate-200 rounded-lg p-3 text-center hover:border-emerald-500 transition-all"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-xs font-semibold text-slate-900">Upgrade Plan</div>
          </Link>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Transaction History</h2>
          
          <div className="space-y-3">
            {/* Payment 1 - Approved */}
            <div className="border-l-4 border-emerald-500 bg-slate-50 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-900">Member Plus</span>
                  </div>
                  <div className="text-xs text-slate-600 mb-1">Payment Reference: LC-P-30491</div>
                  <div className="text-xs text-slate-500">Paid: 13 May 2026</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">R96.00</div>
                  <div className="text-xs text-emerald-600">Approved</div>
                </div>
              </div>
              <button className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
                <Download className="w-3 h-3" />
                Download Receipt
              </button>
            </div>

            {/* Payment 2 - Approved */}
            <div className="border-l-4 border-slate-300 bg-slate-50 rounded-lg p-3 opacity-60">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-900">Member Basic</span>
                  </div>
                  <div className="text-xs text-slate-600 mb-1">Payment Reference: LC-M-10482</div>
                  <div className="text-xs text-slate-500">Paid: 13 May 2025</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">R36.00</div>
                  <div className="text-xs text-slate-600">Approved</div>
                </div>
              </div>
              <button className="flex items-center gap-1 text-xs text-slate-600 font-semibold hover:text-slate-700">
                <Download className="w-3 h-3" />
                Download Receipt
              </button>
            </div>
          </div>
        </div>

        {/* Pending Payments (if any) */}
        {/* <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Pending Payments</h2>
          
          <div className="border-l-4 border-amber-500 bg-amber-50 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-slate-900">Member Plus Renewal</span>
                </div>
                <div className="text-xs text-slate-600 mb-1">Payment Reference: LC-P-30492</div>
                <div className="text-xs text-slate-500">Submitted: 10 May 2026</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-slate-900">R96.00</div>
                <div className="text-xs text-amber-600">Under Review</div>
              </div>
            </div>
            <p className="text-xs text-amber-800">
              Your payment is being reviewed. This usually takes 24 hours.
            </p>
          </div>
        </div> */}

        {/* Payment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h3 className="text-xs font-semibold text-blue-900 mb-2">Payment Information</h3>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>• All payments are processed via EFT</li>
            <li>• Receipts are available after approval</li>
            <li>• Memberships auto-expire, no auto-renewal</li>
            <li>• Refunds available within 7 days of payment</li>
          </ul>
        </div>

        {/* Support */}
        <div className="text-center">
          <p className="text-xs text-slate-600 mb-2">Need help with a payment?</p>
          <Link href="/help" className="text-xs font-semibold text-emerald-600">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
