'use client';
import DesktopNav from './DesktopNav';

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="px-4 py-3 max-w-6xl mx-auto flex items-center justify-center">
        {/* Desktop Navigation - Centered */}
        <DesktopNav />
      </div>
    </header>
  );
}
