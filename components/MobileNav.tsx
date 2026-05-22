'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Plus, Bell, User } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MobileNav() {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/routes', label: 'Routes', icon: Search },
    { href: '/dashboard/driver/routes', label: 'My Routes', icon: Plus },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Profile', icon: User },
  ];

  useEffect(() => {
    const index = navItems.findIndex(item => {
      if (item.href === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(item.href);
    });
    setActiveIndex(index >= 0 ? index : 0);
  }, [pathname]);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="relative mx-auto max-w-md px-4 pb-4">
        <div className="relative w-full h-[70px] bg-white rounded-[10px] shadow-lg flex items-center justify-center">
          <ul className="flex w-[350px] relative">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeIndex === index;
              
              return (
                <li
                  key={item.href}
                  className={`relative w-[70px] h-[70px] z-10 ${isActive ? 'active' : ''}`}
                >
                  <Link
                    href={item.href}
                    className="relative w-full flex flex-col items-center justify-center font-semibold text-center"
                    onClick={() => setActiveIndex(index)}
                  >
                    <Icon
                      className={`relative block text-2xl text-slate-900 transition-all duration-500 ${
                        isActive ? '-translate-y-[35px] text-white drop-shadow-lg' : ''
                      }`}
                      size={24}
                      strokeWidth={2}
                    />
                    <span
                      className={`absolute text-slate-900 text-xs tracking-wider transition-all duration-500 ${
                        isActive ? 'opacity-100 translate-y-[10px]' : 'opacity-0'
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
            
            {/* Animated Indicator */}
            <div
              className="absolute h-[70px] w-[70px] bg-emerald-500 rounded-full -top-[50%] border-[6px] border-slate-900 transition-transform duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] before:absolute before:content-[''] before:w-[20px] before:h-[20px] before:top-1/2 before:bg-transparent before:-left-[22px] before:rounded-tr-[20px] before:shadow-[1px_-10px_0_0_#1e293b] after:absolute after:content-[''] after:w-[20px] after:h-[20px] after:top-1/2 after:bg-transparent after:-right-[22px] after:rounded-tl-[20px] after:shadow-[-1px_-10px_0_0_#1e293b]"
              style={{
                transform: `translateX(calc(70px * ${activeIndex}))`,
              }}
            />
          </ul>
        </div>
      </div>
    </div>
  );
}
