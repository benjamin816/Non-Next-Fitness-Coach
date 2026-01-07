
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Settings as SettingsIcon, Dumbbell } from 'lucide-react';

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  
  // Don't show nav on onboarding (root page if no profile)
  const isDashboard = pathname !== "/";

  const navItems = [
    { label: 'Today', path: '/today', icon: LayoutDashboard },
    { label: 'Progress', path: '/progress', icon: TrendingUp },
    { label: 'Lifting', path: '/lifting', icon: Dumbbell },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  if (!isDashboard) return <main>{children}</main>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 md:pb-0">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-30 flex justify-between items-center md:hidden">
        <h1 className="text-xl font-bold text-blue-600">Fitness Coach</h1>
      </header>
      
      <nav className="hidden md:flex bg-white border-b sticky top-0 z-30 px-6 py-4 justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Fitness Coach</h1>
        <div className="flex space-x-8">
          {navItems.map((item) => (
            <Link 
              key={item.path}
              href={item.path} 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                pathname === item.path ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-8 max-w-4xl mx-auto w-full">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 px-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <Link 
            key={item.path}
            href={item.path} 
            className={`flex flex-col items-center space-y-1 transition-all ${
              pathname === item.path ? 'text-blue-600 scale-110' : 'text-gray-400'
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default LayoutWrapper;
