import Link from 'next/link';
import Image from 'next/image';
import { Shield, CheckCircle, Users, MessageSquare, Search, Car } from 'lucide-react';
import GPSHeroBackground from './components/GPSHeroBackground';
import { Button } from '@/components/ui/button';

export default function Home() {
  const primaryHref = '/routes';
  const primaryLabel = 'Browse Routes';
  const secondaryHref = '/register?type=driver';
  const secondaryLabel = 'Join as Driver';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* GPS Animated Hero */}
      <GPSHeroBackground>
        <div className="px-3 py-12 pb-[280px] max-w-md mx-auto">
          {/* Hero Content */}
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-white mb-3 drop-shadow-2xl tracking-tight uppercase">LIFTCHECK S.A</h1>
            <p className="text-base text-slate-900 mb-2 font-bold drop-shadow-lg bg-white/95 inline-block px-3 py-0.5 rounded-lg">
              Check the driver before you pay.
            </p>
            <p className="text-sm text-slate-900 drop-shadow-lg font-bold mt-3 leading-relaxed">
              Verified drivers and passengers<br />
              for safer lift sharing in South Africa.
            </p>
          </div>
        </div>
      </GPSHeroBackground>

      {/* Buttons - Outside animation */}
      <div className="px-3 -mt-8 max-w-md mx-auto relative z-30">
        <div className="flex gap-3 justify-center -translate-y-[30px]">
          <Link href={primaryHref}>
            <Button
              className="h-14 text-lg px-8 from-white to-white/95 text-emerald-600 border-2 border-emerald-600/20 bg-gradient-to-t shadow-xl shadow-white/50 ring-4 ring-offset ring-slate-900/30 transition-[filter] duration-200 hover:brightness-110 active:brightness-100 flex items-center gap-2"
            >
              <Search strokeWidth={2} className="size-7" />
              {primaryLabel}
            </Button>
          </Link>
          <Link href={secondaryHref}>
            <Button
              className="h-14 text-lg px-8 from-emerald-600 to-emerald-600/90 text-white border-2 border-white/10 bg-gradient-to-t shadow-xl shadow-emerald-600/70 ring-4 ring-offset ring-slate-900/30 transition-[filter] duration-200 hover:brightness-120 active:brightness-100 flex items-center gap-2"
            >
              <Car strokeWidth={2} className="size-7" />
              {secondaryLabel}
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-3 py-4 max-w-md mx-auto -mt-[10px]">

        {/* Safety Promise - Minimal */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Safety Promise</h2>
          </div>
          <p className="text-xs text-slate-300 leading-tight">
            Check the driver, vehicle and route before you pay or travel.
          </p>
        </div>

        {/* Features - Ultra Compact 2x2 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
            <CheckCircle className="w-6 h-6 text-emerald-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-white mb-0.5">Verified Drivers</h3>
            <p className="text-[10px] text-slate-400 leading-tight">
              ID, licence and vehicle checked
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
            <Shield className="w-6 h-6 text-emerald-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-white mb-0.5">Match Check</h3>
            <p className="text-[10px] text-slate-400 leading-tight">
              Confirm driver, vehicle and plate
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
            <MessageSquare className="w-6 h-6 text-emerald-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-white mb-0.5">In-App Chat</h3>
            <p className="text-[10px] text-slate-400 leading-tight">
              Safe messaging with images
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
            <Users className="w-6 h-6 text-emerald-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-white mb-0.5">Bluetooth Verify</h3>
            <p className="text-[10px] text-slate-400 leading-tight">
              Offline verification, no data
            </p>
          </div>
        </div>

        {/* How It Works - Minimal */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700/50">
          <h2 className="text-sm font-bold text-white text-center mb-2.5">How It Works</h2>
          <div className="space-y-2">
            <div className="flex gap-2.5 items-start">
              <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-white mb-0.5">Admin Creates Routes</h3>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Official routes are published with approved stops and pricing
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-white mb-0.5">Drivers Get Approved</h3>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Drivers complete payment, verification, and vehicle approval
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-white mb-0.5">Passengers Request Seats</h3>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Choose a route, request a seat, and verify before you travel
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing - Ultra Compact */}
        <div id="pricing" className="mb-4 scroll-mt-20">
          <h2 className="text-sm font-bold text-white text-center mb-2.5">Simple Pricing</h2>
          <div className="space-y-2">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-xs font-semibold text-white">Member 12 Months</h3>
                <div className="text-base font-bold text-emerald-400">R36/yr</div>
              </div>
              <p className="text-[10px] text-slate-400 mb-2 leading-tight">
                Verified profile • Bluetooth Verify • Driver checks • Chat • Ratings
              </p>
              <Link 
                href="/register?type=member&plan=basic"
                className="block bg-emerald-500 hover:bg-emerald-600 text-white text-center py-2 rounded-lg text-xs font-semibold"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-xs font-semibold text-white">Driver 3 Months</h3>
                <div className="text-base font-bold text-emerald-400">R120</div>
              </div>
              <p className="text-[10px] text-slate-400 mb-2 leading-tight">
                Verified badge • Admin review • Official route assignment
              </p>
              <Link 
                href="/register?type=driver&plan=quarterly"
                className="block bg-emerald-500 hover:bg-emerald-600 text-white text-center py-2 rounded-lg text-xs font-semibold"
              >
                Become a Driver
              </Link>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-xs font-semibold text-white">Driver 12 Months</h3>
                <div className="text-base font-bold text-emerald-400">R300</div>
              </div>
              <p className="text-[10px] text-slate-400 mb-2 leading-tight">
                Verified badge • Admin review • Official route assignment
              </p>
              <Link 
                href="/register?type=driver&plan=annual"
                className="block bg-white hover:bg-slate-100 text-slate-900 text-center py-2 rounded-lg text-xs font-semibold"
              >
                Become a Driver
              </Link>
            </div>
          </div>
        </div>

        {/* CTA - Minimal */}
        <div className="text-center mb-4">
          <h2 className="text-sm font-bold text-white mb-1">Ready to travel safer?</h2>
          <p className="text-xs text-slate-300 mb-3">
            Join verified drivers and members across South Africa
          </p>
          <Link 
            href="/register"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-xs font-semibold"
          >
            Get Started Now
          </Link>
        </div>

        {/* FAQ Section */}
        <div id="about" className="mb-4 scroll-mt-20">
          <h2 className="text-sm font-bold text-white text-center mb-3">Frequently Asked Questions</h2>
          
          <div className="space-y-2">
            {/* FAQ Item 1 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>What is LiftCheck S.A?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                LiftCheck S.A is a safety verification platform for lift clubs in South Africa. We help you check driver credentials, vehicle details, and ratings before you pay or travel. We work alongside your existing Facebook and WhatsApp lift groups.
              </div>
            </details>

            {/* FAQ Item 2 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>How does Bluetooth Verification work?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                Bluetooth Verification lets you confirm the driver's identity when you meet in person, without using mobile data. Both you and the driver tap "Verify" in the app, and your phones exchange encrypted tokens via Bluetooth to confirm the match.
              </div>
            </details>

            {/* FAQ Item 3 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>Do I need to pay upfront?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                No. You can browse official routes for free. Only sign up when you're ready to request a seat. LiftCheck handles membership and verification while trip payments follow the approved route flow.
              </div>
            </details>

            {/* FAQ Item 4 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>What membership options are available?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                Members use one 12-month plan. Drivers can choose a 3-month or 12-month verified provider plan.
              </div>
            </details>

            {/* FAQ Item 5 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>How do drivers get verified?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                Drivers upload their ID, driver's license, and vehicle documents. Our admin team manually reviews each application. Once approved, drivers are assigned to official routes instead of publishing open trips.
              </div>
            </details>

            {/* FAQ Item 6 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>Can I use this with my Facebook lift group?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                Yes. LiftCheck can still support your existing groups, but route availability is managed inside the platform by admins and approved drivers.
              </div>
            </details>

            {/* FAQ Item 7 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>What if I have a problem with a driver?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                You can report issues directly in the app. Our admin team reviews all reports within 24 hours. Serious violations result in account suspension. You can also rate drivers after each trip to help other members.
              </div>
            </details>

            {/* FAQ Item 8 */}
            <details className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden group">
              <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-white hover:bg-slate-800/70">
                <span>Is my personal information safe?</span>
                <span className="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-[10px] text-slate-300 leading-relaxed">
                Yes. We use bank-level encryption for all data. Your phone number and full name are only visible to drivers you've requested trips with. License plate numbers are hidden until you sign up and request a specific trip.
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-3">
        <p className="text-center text-slate-500 text-[10px]">
          &copy; 2026 LiftCheck S.A. Verified lift club safety for South Africa.
        </p>
      </footer>
    </div>
  );
}
