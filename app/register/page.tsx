'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Car, ArrowLeft, Upload, Camera, X, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react';
import { signUp } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const initialStep = searchParams.get('type');
  const [step, setStep] = useState<'choose' | 'member' | 'driver' | 'group_admin'>(
    initialStep === 'member' || initialStep === 'driver' || initialStep === 'group_admin'
      ? initialStep
      : 'choose'
  );

  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-slate-600 text-sm mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Get Started</h1>
            <p className="text-sm text-slate-600">Choose your account type</p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep('member')}
              className="w-full bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-left transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-2.5 rounded-lg">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 mb-1">I Need Lifts</h3>
                  <p className="text-xs text-slate-600 mb-2">Find verified drivers and travel safely</p>
                  <span className="text-xs font-semibold text-emerald-600">From R36/year</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStep('driver')}
              className="w-full bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-left transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-2.5 rounded-lg">
                  <Car className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 mb-1">I Offer Lifts</h3>
                  <p className="text-xs text-slate-600 mb-2">Get verified and share your trips safely</p>
                  <span className="text-xs font-semibold text-emerald-600">R300/year</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStep('group_admin')}
              className="w-full bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-left transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2.5 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 mb-1">I Manage a Group</h3>
                  <p className="text-xs text-slate-600 mb-2">Keep your Facebook/WhatsApp group safe</p>
                  <span className="text-xs font-semibold text-blue-600">Free Access</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'member') {
    return <MemberForm onBack={() => setStep('choose')} />;
  }

  if (step === 'driver') {
    return <DriverForm onBack={() => setStep('choose')} />;
  }

  if (step === 'group_admin') {
    return <GroupAdminForm onBack={() => setStep('choose')} />;
  }

  return null;
}

function MemberForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [plan, setPlan] = useState<'basic' | 'plus'>('basic');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string>('');
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    password: '',
    homeProvince: '',
  });

  // Auto-redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(async () => {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        router.push('/dashboard/member');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [success, formData.email, formData.password, router]);

  const handleIdDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdDoc(file);
      const reader = new FileReader();
      reader.onloadend = () => setIdDocPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfie(file);
      const reader = new FileReader();
      reader.onloadend = () => setSelfiePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signUp({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      surname: formData.surname,
      phone: formData.phone,
      role: 'member',
      membershipType: plan,
      homeProvince: formData.homeProvince,
      idDocument: idDoc || undefined,
      selfie: selfie || undefined,
    });

    if (result.success && result.paymentReference) {
      setPaymentRef(result.paymentReference);
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h1>
            <p className="text-sm text-slate-600 mb-2">Complete payment to activate</p>
            <p className="text-xs text-emerald-600 font-semibold animate-pulse">Redirecting to dashboard...</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div className="text-center mb-3">
              <div className="text-xs text-emerald-700 font-semibold mb-1">Payment Reference</div>
              <div className="text-2xl font-bold text-emerald-900">{paymentRef}</div>
            </div>
            <div className="text-xs text-emerald-800">
              <strong>Amount:</strong> R{plan === 'basic' ? '36' : '96'}.00
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-700 mb-2"><strong>Bank Details:</strong></p>
            <div className="space-y-1 text-xs text-slate-600">
              <div>Bank: Tyme Bank</div>
              <div>Account: LiftCheck Safety</div>
              <div>Account No: 51129386380</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-6 max-w-md mx-auto">
        <button onClick={onBack} className="inline-flex items-center text-slate-600 text-sm mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Member Sign Up</h1>
        
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Choose Plan</label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Membership plan">
            <label
              className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-colors ${
                plan === 'basic' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="member-plan"
                value="basic"
                checked={plan === 'basic'}
                onChange={() => setPlan('basic')}
                className="sr-only"
              />
              <div className="text-sm font-semibold text-slate-900">Basic</div>
              <div className="text-lg font-bold text-emerald-600">R36/yr</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Verified profile, trip booking, driver checks, chat, and ratings.
              </p>
            </label>
            <label
              className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-colors ${
                plan === 'plus' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="member-plan"
                value="plus"
                checked={plan === 'plus'}
                onChange={() => setPlan('plus')}
                className="sr-only"
              />
              <div className="text-sm font-semibold text-slate-900">Plus</div>
              <div className="text-lg font-bold text-emerald-600">R96/yr</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Everything in Basic plus Trip Share, route alerts, and trusted drivers.
              </p>
            </label>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Surname</label>
            <input
              type="text"
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Identification (SA ID, Passport, or Driver's Licence)</label>
            {!idDocPreview ? (
              <label className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500">
                <input type="file" accept="image/*,application/pdf" onChange={handleIdDocChange} className="hidden" required />
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-600">Upload ID</p>
                <p className="text-[10px] text-slate-500 mt-1">JPG, PNG or PDF • Max 2MB</p>
              </label>
            ) : (
              <div className="relative border-2 border-emerald-500 rounded-lg p-2">
                <img src={idDocPreview} alt="ID Preview" className="w-full h-32 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => { setIdDoc(null); setIdDocPreview(''); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-xs text-slate-600 mt-2 text-center">{idDoc?.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Selfie</label>
            {!selfiePreview ? (
              <label className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500">
                <input type="file" accept="image/*" capture="user" onChange={handleSelfieChange} className="hidden" required />
                <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-600">Take selfie</p>
                <p className="text-[10px] text-slate-500 mt-1">JPG or PNG • Max 2MB</p>
              </label>
            ) : (
              <div className="relative border-2 border-emerald-500 rounded-lg p-2">
                <img src={selfiePreview} alt="Selfie Preview" className="w-full h-32 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => { setSelfie(null); setSelfiePreview(''); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-xs text-slate-600 mt-2 text-center">{selfie?.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <PasswordField
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Home Province</label>
            <select 
              value={formData.homeProvince}
              onChange={(e) => setFormData({ ...formData, homeProvince: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select province</option>
              <option value="WC">Western Cape</option>
              <option value="EC">Eastern Cape</option>
              <option value="GP">Gauteng</option>
              <option value="KZN">KwaZulu-Natal</option>
              <option value="LP">Limpopo</option>
              <option value="MP">Mpumalanga</option>
              <option value="NC">Northern Cape</option>
              <option value="NW">North West</option>
              <option value="FS">Free State</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white py-3 rounded-lg text-sm font-semibold">
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DriverForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [plan, setPlan] = useState<'provider_monthly' | 'provider_quarterly' | 'provider_annual'>('provider_annual');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string>('');
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    password: '',
  });

  // Auto-redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(async () => {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        router.push('/dashboard/driver');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [success, formData.email, formData.password, router]);

  const handleIdDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdDoc(file);
      const reader = new FileReader();
      reader.onloadend = () => setIdDocPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfie(file);
      const reader = new FileReader();
      reader.onloadend = () => setSelfiePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return; // Prevent double submission
    
    setLoading(true);
    setError('');

    const result = await signUp({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      surname: formData.surname,
      phone: formData.phone,
      role: 'driver',
      membershipType: plan,
      idDocument: idDoc || undefined,
      selfie: selfie || undefined,
    });

    console.log('SignUp result:', result);
    setLoading(false);

    if (result.error) {
      console.error('SignUp error:', result.error);
      setError(result.error);
      return;
    }

    if (result.success && result.paymentReference) {
      console.log('Success! Payment ref:', result.paymentReference);
      setPaymentRef(result.paymentReference);
      setSuccess(true);
    } else {
      console.error('No success or payment reference:', result);
      setError('Registration failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Driver Account Created!</h1>
            <p className="text-sm text-slate-600 mb-2">Complete payment to activate</p>
            <p className="text-xs text-emerald-600 font-semibold animate-pulse">Redirecting to dashboard...</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div className="text-center mb-3">
              <div className="text-xs text-emerald-700 font-semibold mb-1">Payment Reference</div>
              <div className="text-2xl font-bold text-emerald-900">{paymentRef}</div>
            </div>
            <div className="text-xs text-emerald-800">
              <strong>Amount:</strong> R{plan === 'provider_monthly' ? '45' : plan === 'provider_quarterly' ? '120' : '300'}.00
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-700 mb-2"><strong>Bank Details:</strong></p>
            <div className="space-y-1 text-xs text-slate-600">
              <div>Bank: Tyme Bank</div>
              <div>Account: LiftCheck Safety</div>
              <div>Account No: 51129386380</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-6 max-w-md mx-auto">
        <button onClick={onBack} className="inline-flex items-center text-slate-600 text-sm mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Driver Sign Up</h1>
        
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Choose Plan</label>
          <div className="space-y-2" role="radiogroup" aria-label="Driver membership plan">
            <label
              className={`cursor-pointer block rounded-lg border-2 p-3 text-left transition-colors ${
                plan === 'provider_monthly' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="driver-plan"
                value="provider_monthly"
                checked={plan === 'provider_monthly'}
                onChange={() => setPlan('provider_monthly')}
                className="sr-only"
              />
              <div className="flex justify-between items-center">
                <div className="text-sm font-semibold">1 Month</div>
                <div className="text-lg font-bold text-emerald-600">R45</div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Best for a one-time trip or a short test run with full driver tools.
              </p>
            </label>
            <label
              className={`cursor-pointer block rounded-lg border-2 p-3 text-left transition-colors ${
                plan === 'provider_quarterly' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="driver-plan"
                value="provider_quarterly"
                checked={plan === 'provider_quarterly'}
                onChange={() => setPlan('provider_quarterly')}
                className="sr-only"
              />
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold">3 Months</div>
                  <div className="text-xs text-emerald-600 font-semibold">Save R15</div>
                </div>
                <div className="text-lg font-bold text-emerald-600">R120</div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Good for seasonal drivers who want verified trips for a few months.
              </p>
            </label>
            <label
              className={`cursor-pointer relative block rounded-lg border-2 p-3 text-left transition-colors ${
                plan === 'provider_annual' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="driver-plan"
                value="provider_annual"
                checked={plan === 'provider_annual'}
                onChange={() => setPlan('provider_annual')}
                className="sr-only"
              />
              <div className="absolute -top-2 right-3 bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                MOST POPULAR
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold">12 Months</div>
                  <div className="text-xs text-emerald-600 font-semibold">Save R240</div>
                </div>
                <div className="text-lg font-bold text-emerald-600">R300</div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Best value for regular drivers who publish trips all year.
              </p>
            </label>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Surname</label>
            <input
              type="text"
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Identification (SA ID, Passport, or Driver's Licence)</label>
            {!idDocPreview ? (
              <label className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500">
                <input type="file" accept="image/*,application/pdf" onChange={handleIdDocChange} className="hidden" required />
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-600">Upload ID</p>
                <p className="text-[10px] text-slate-500 mt-1">JPG, PNG or PDF • Max 2MB</p>
              </label>
            ) : (
              <div className="relative border-2 border-emerald-500 rounded-lg p-2">
                <img src={idDocPreview} alt="ID Preview" className="w-full h-32 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => { setIdDoc(null); setIdDocPreview(''); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-xs text-slate-600 mt-2 text-center">{idDoc?.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Selfie</label>
            {!selfiePreview ? (
              <label className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500">
                <input type="file" accept="image/*" capture="user" onChange={handleSelfieChange} className="hidden" required />
                <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-600">Take selfie</p>
                <p className="text-[10px] text-slate-500 mt-1">JPG or PNG • Max 2MB</p>
              </label>
            ) : (
              <div className="relative border-2 border-emerald-500 rounded-lg p-2">
                <img src={selfiePreview} alt="Selfie Preview" className="w-full h-32 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => { setSelfie(null); setSelfiePreview(''); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-xs text-slate-600 mt-2 text-center">{selfie?.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <PasswordField
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white py-3 rounded-lg text-sm font-semibold">
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  ringColor = 'emerald',
}: {
  value: string;
  onChange: (value: string) => void;
  ringColor?: 'emerald' | 'blue';
}) {
  const [showPassword, setShowPassword] = useState(false);
  const ringClass = ringColor === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-emerald-500';

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={6}
        className={`w-full px-3 py-2.5 pr-11 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ringClass}`}
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// Member form has ID upload after phone field
// Driver form has ID upload after phone field

function GroupAdminForm({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    password: '',
    groupName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signUp({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      surname: formData.surname,
      phone: formData.phone,
      role: 'group_admin',
      membershipType: 'basic', // Free access, but need a value
      groupName: formData.groupName,
    });

    if (result.success) {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Group Admin Account Created!</h1>
            <p className="text-sm text-slate-600">Your account is being reviewed</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-blue-800 mb-2">
              <strong>Free Access:</strong> Group admins get free access to help keep their communities safe.
            </p>
            <p className="text-xs text-blue-800">
              We'll review your application and activate your account within 24 hours.
            </p>
          </div>

          <Link href="/login" className="block w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold text-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-6 max-w-md mx-auto">
        <button onClick={onBack} className="inline-flex items-center text-slate-600 text-sm mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Group Admin Sign Up</h1>
        <p className="text-xs text-slate-600 mb-4">Free access for Facebook/WhatsApp group managers</p>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Surname</label>
            <input
              type="text"
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Group Name</label>
            <input
              type="text"
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              placeholder="e.g., Cape Town Lifts 2024"
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">Your Facebook or WhatsApp group name</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <PasswordField
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
              ringColor="emerald"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Free Access:</strong> No payment required. We'll verify your group admin status and activate your account.
            </p>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white py-3 rounded-lg text-sm font-semibold">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

