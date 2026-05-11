"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  HelpCircle, 
  LogOut,
  Bell,
  Settings,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';

interface CounselorDashboardLayoutProps {
  children: React.ReactNode;
}

export default function CounselorDashboardLayout({ children }: CounselorDashboardLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const firstName = user?.name.split(' ')[0] || 'Counselor';

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/counselor/dashboard' },
    { icon: Users, label: 'Students', href: '/counselor/students' },
    { icon: FileText, label: 'Session Notes', href: '/counselor/session-notes' },
  ];

  const subNavItems = [
    { label: 'Client Records', href: '/counselor/students' },
    { label: 'Post-Session Notes', href: '/counselor/session-notes' },
    { label: 'Analytics', href: '/counselor/analytics' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Counselor Sidebar */}
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-6 sticky top-0 h-screen shrink-0 z-40">
        <div className="px-6 mb-10">
          <h2 className="text-2xl font-bold text-primary font-headline">GuidanceSync</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Supportive Wellness</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.label} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-muted-foreground hover:bg-muted hover:text-primary'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 space-y-1 mt-auto">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all text-left">
            <HelpCircle className="h-5 w-5" />
            Help Center
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all text-left"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        {/* Top Professional Header */}
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold text-[#1E293B]">Dashboard</h2>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full" asChild>
              <Link href="/counselor/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <div className="pl-4 border-l">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold leading-none">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">Counselor</p>
                </div>
                <Avatar className="h-9 w-9 ring-2 ring-primary/5">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.id}/64/64`} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">{firstName[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-Navigation Header */}
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-16 z-30">
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

          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search students..."
              className="pl-10 h-10 bg-slate-100/50 border-none rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
