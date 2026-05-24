'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronDown, ChevronUp, MessageSquare, Mail, Phone } from 'lucide-react';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Tap "Get Started" on the home page, choose your account type (Member or Driver), fill in your details, and complete the payment process. Your account will be activated within 24 hours after payment approval.',
        },
        {
          q: 'What membership options are available?',
          a: 'Members now have one 12-month plan. Drivers can choose a 3-month or 12-month verified provider plan.',
        },
        {
          q: 'How much does it cost to become a verified driver?',
          a: 'Driver plans are available for 3 months or 12 months. The provider account is reviewed by admin before activation.',
        },
      ],
    },
    {
      category: 'Safety & Verification',
      questions: [
        {
          q: 'What is Match Check?',
          a: 'Match Check is a safety feature that helps you confirm the driver\'s face, vehicle, and licence plate match their profile before getting in. Always complete Match Check at pickup.',
        },
        {
          q: 'What is Zii Verify?',
          a: 'Zii Verify is our offline Bluetooth verification system. It allows you to verify drivers even when you don\'t have data or signal, perfect for rural areas or when airtime is low.',
        },
        {
          q: 'How do I report a scammer?',
          a: 'Go to your dashboard, tap "Report Scammer", select the issue type, provide details and evidence, and submit. Our team reviews all reports within 24 hours.',
        },
      ],
    },
    {
      category: 'Routes & Seats',
      questions: [
        {
          q: 'How do I request a seat?',
          a: 'Browse active routes, open the route details, choose your pickup and drop-off stops, then tap "Request a Seat". You\'ll receive a notification when approved.',
        },
        {
          q: 'Can I cancel a seat request?',
          a: 'Yes, you can cancel before the request is matched or confirmed. Go to the route request details and tap "Cancel".',
        },
        {
          q: 'What if the driver does not respond?',
          a: 'If a driver does not respond, report them immediately through the app. Include evidence like route messages or payment proof. We take no-shows seriously.',
        },
      ],
    },
    {
      category: 'Payments',
      questions: [
        {
          q: 'How do I pay for membership?',
          a: 'We use EFT payments. After registration, you\'ll receive banking details and a unique reference number. Pay via EFT, upload proof of payment, and we\'ll activate your account within 24 hours.',
        },
        {
          q: 'When does my membership expire?',
          a: 'Member memberships are valid for 12 months from activation. Driver plans are valid for either 3 months or 12 months depending on the option you choose.',
        },
        {
          q: 'Can I get a refund?',
          a: 'Refunds are available within 7 days of payment if you haven\'t used any services. Contact support with your payment reference to request a refund.',
        },
      ],
    },
    {
      category: 'For Drivers',
      questions: [
        {
          q: 'How do drivers get a route?',
          a: 'Drivers do not publish open route offers themselves. Admins create official routes, and approved drivers are assigned to those routes.',
        },
        {
          q: 'How do passengers contact the driver?',
          a: 'Passengers browse official routes inside LiftCheck. Once approved and assigned, drivers use route assignment and chat instead of sharing open route posts.',
        },
        {
          q: 'What documents do I need for verification?',
          a: 'You need: valid SA ID, valid driver\'s licence (Code B or higher), vehicle registration, licence disc, and clear photos of your vehicle. All documents must be current and readable.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <Link href="/settings" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mb-3">Help Center</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* Quick Contact */}
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          <a
            href="mailto:support@liftcheck.co.za"
            className="bg-white border border-slate-200 rounded-lg p-4 text-center hover:border-emerald-500 transition-all"
          >
            <Mail className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-900 mb-1">Email Us</div>
            <div className="text-xs text-slate-600">support@liftcheck.co.za</div>
          </a>

          <a
            href="tel:0861543823"
            className="bg-white border border-slate-200 rounded-lg p-4 text-center hover:border-emerald-500 transition-all"
          >
            <Phone className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-900 mb-1">Call Us</div>
            <div className="text-xs text-slate-600">0861 LIFTCHECK</div>
          </a>

          <Link
            href="/chat-support"
            className="bg-white border border-slate-200 rounded-lg p-4 text-center hover:border-emerald-500 transition-all"
          >
            <MessageSquare className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-900 mb-1">Live Chat</div>
            <div className="text-xs text-slate-600">Mon-Fri, 8am-5pm</div>
          </Link>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          {faqs.map((category, catIndex) => (
            <div key={catIndex} className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">{category.category}</h2>
              <div className="space-y-2">
                {category.questions.map((faq, qIndex) => {
                  const faqId = catIndex * 100 + qIndex;
                  const isOpen = openFaq === faqId;
                  
                  return (
                    <div key={qIndex} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : faqId)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-all"
                      >
                        <span className="text-sm font-semibold text-slate-900 pr-2">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3">
                          <p className="text-sm text-slate-700 leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help */}
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
          <h3 className="text-sm font-bold text-emerald-900 mb-2">Still need help?</h3>
          <p className="text-xs text-emerald-800 mb-3">
            Our support team is here to help you with any questions or issues.
          </p>
          <a
            href="mailto:support@liftcheck.co.za"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
