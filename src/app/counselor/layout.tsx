
"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CounselorLayoutProps {
  children: React.ReactNode;
}

export default function CounselorLayout({ children }: CounselorLayoutProps) {
  const pathname = usePathname();

  const subNavItems = [
    { label: 'Client Records', href: '/counselor/students' },
    { label: 'Post-Session Notes', href: '/counselor/session-notes' },
    { label: 'Analytics', href: '/counselor/analytics' },
  ];

  return (
    <ProtectedRoute allowedRoles={['counselor']}>
      <DashboardLayout>
        <div className="flex flex-col h-full bg-slate-50/50">
          {/* Counselor Sub-Header */}
          <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-30">
            <nav className="flex items-center gap-8">
              {subNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`text-sm font-bold transition-all relative py-2 ${
                      isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  className="pl-10 h-10 bg-slate-100/50 border-none rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex-1">
            {children}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
