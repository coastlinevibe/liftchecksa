'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Car, CreditCard, Info, Shield } from 'lucide-react';

export default function DesktopNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener('hashchange', syncHash);

    return () => {
      window.removeEventListener('hashchange', syncHash);
    };
  }, []);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/routes', label: 'Routes', icon: Car },
    { href: '/#pricing', label: 'Pricing', icon: CreditCard },
    { href: '/#about', label: 'About', icon: Info },
    { href: '/login', label: 'Login', icon: Shield },
  ];

  return (
    <nav className="hidden md:block">
      <div className="inline-flex -space-x-px rounded-lg shadow-sm shadow-black/5 rtl:space-x-reverse">
        {navItems.map((item) => {
          const Icon = item.icon;
          const [itemPath, itemHash = ''] = item.href.split('#');
          const normalizedHash = itemHash ? `#${itemHash}` : '';
          const isHashLink = normalizedHash.length > 0;
          const isActive = isHashLink
            ? pathname === itemPath && hash === normalizedHash
            : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Button
              key={item.href}
              asChild
              className={`rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 ${
                isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
              variant="outline"
            >
              <Link href={item.href}>
                <Icon className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
