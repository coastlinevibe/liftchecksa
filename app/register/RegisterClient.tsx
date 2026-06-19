'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { signUp } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/client';

type Step = 'member' | 'driver';

function getDriverPlanFromQuery(plan: string | null): 'provider_quarterly' | 'provider_annual' {
  if (plan === 'quarterly' || plan === 'provider_quarterly' || plan === '3months') {
    return 'provider_quarterly';
  }
  return 'provider_annual';
}

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type');
  const initialDriverPlan = getDriverPlanFromQuery(searchParams.get('plan'));
  const [step] = useState<Step>(
    initialType === 'driver' ? 'driver' : 'member'
  );

  const handleBack = () => {
    router.push('/');
  };

  if (step === 'driver') return <DriverForm initialPlan={initialDriverPlan} onBack={handleBack} />;
  return <MemberForm onBack={handleBack} />;
}

function MemberForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [plan, setPlan] = useState<'basic' | 'plus'>('basic');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    password: '',
    homeProvince: '',
  });

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      router.push('/dashboard/member');
    }, 2000);
    return () => clearTimeout(timer);
  }, [success, formData.email, formData.password, router]);

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
              <strong>Amount:</strong> R{plan === 'plus' ? '96' : '36'}.00
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

        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          Choose your 12-month member plan.
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Choose Plan</label>
          <div className="grid grid-cols-2 gap-2">
            <PlanCard
              active={plan === 'basic'}
              title="Basic"
              price="R36 / 12 months"
              detail="Route browsing, seat requests, chat, and safety checks."
              onClick={() => setPlan('basic')}
            />
            <PlanCard
              active={plan === 'plus'}
              title="Upgraded"
              price="R96 / 12 months"
              detail="Everything in Basic plus upgraded member access."
              onClick={() => setPlan('plus')}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <TextField label="First Name" value={formData.firstName} onChange={(firstName) => setFormData({ ...formData, firstName })} />
          <TextField label="Surname" value={formData.surname} onChange={(surname) => setFormData({ ...formData, surname })} />
          <TextField label="Phone" value={formData.phone} onChange={(phone) => setFormData({ ...formData, phone })} type="tel" />
          <TextField label="Email" value={formData.email} onChange={(email) => setFormData({ ...formData, email })} type="email" />
          <PasswordField value={formData.password} onChange={(password) => setFormData({ ...formData, password })} showPassword={showPassword} setShowPassword={setShowPassword} />
          <ProvinceField value={formData.homeProvince} onChange={(homeProvince) => setFormData({ ...formData, homeProvince })} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white py-3 rounded-lg text-sm font-semibold"
          >
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DriverForm({
  onBack,
  initialPlan,
}: {
  onBack: () => void;
  initialPlan: 'provider_quarterly' | 'provider_annual';
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [plan, setPlan] = useState<'provider_quarterly' | 'provider_annual'>(initialPlan);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      router.push('/dashboard/driver/vehicles/add');
    }, 2000);
    return () => clearTimeout(timer);
  }, [success, formData.email, formData.password, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signUp({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      surname: formData.surname,
      phone: formData.phone,
      role: 'driver',
      membershipType: plan,
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
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Driver Account Created!</h1>
            <p className="text-sm text-slate-600 mb-2">Next step: add your vehicle</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div className="text-center mb-3">
              <div className="text-xs text-emerald-700 font-semibold mb-1">Payment Reference</div>
              <div className="text-2xl font-bold text-emerald-900">{paymentRef}</div>
            </div>
            <div className="text-xs text-emerald-800">
              <strong>Amount:</strong> R{plan === 'provider_quarterly' ? '120' : '300'}.00
            </div>
            <div className="mt-2 text-xs text-emerald-800">
              After login you will be taken straight to vehicle setup so you can register your car before applying for routes.
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

        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          Choose a 3-month or 12-month provider plan, then add your vehicle after signup.
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Choose Plan</label>
          <div className="grid grid-cols-2 gap-2">
            <PlanCard
              active={plan === 'provider_quarterly'}
              title="3 Months"
              price="R120"
              onClick={() => setPlan('provider_quarterly')}
            />
            <PlanCard
              active={plan === 'provider_annual'}
              title="12 Months"
              price="R300"
              onClick={() => setPlan('provider_annual')}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <TextField label="First Name" value={formData.firstName} onChange={(firstName) => setFormData({ ...formData, firstName })} />
          <TextField label="Surname" value={formData.surname} onChange={(surname) => setFormData({ ...formData, surname })} />
          <TextField label="Phone" value={formData.phone} onChange={(phone) => setFormData({ ...formData, phone })} type="tel" />
          <TextField label="Email" value={formData.email} onChange={(email) => setFormData({ ...formData, email })} type="email" />
          <PasswordField value={formData.password} onChange={(password) => setFormData({ ...formData, password })} showPassword={showPassword} setShowPassword={setShowPassword} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white py-3 rounded-lg text-sm font-semibold"
          >
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function PlanCard({
  active,
  title,
  price,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  price: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-colors ${
        active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
      }`}
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="text-lg font-bold text-emerald-600">{price}</div>
      {detail ? <div className="mt-1 text-[11px] leading-tight text-slate-600">{detail}</div> : null}
    </button>
  );
}

function ProvinceField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Home Province</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  );
}

function PasswordField({
  value,
  onChange,
  showPassword = false,
  setShowPassword,
}: {
  value: string;
  onChange: (value: string) => void;
  showPassword?: boolean;
  setShowPassword?: (value: boolean) => void;
}) {
  const [internalShowPassword, setInternalShowPassword] = useState(false);
  const visible = setShowPassword ? showPassword : internalShowPassword;
  const toggle = () => {
    if (setShowPassword) setShowPassword(!visible);
    else setInternalShowPassword((current) => !current);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2.5 pr-11 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
