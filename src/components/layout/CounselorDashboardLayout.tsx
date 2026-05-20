"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  HelpCircle, 
  LogOut,
  Settings,
  Search,
  Calendar,
  MessageSquare,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import NotificationBell from '@/components/common/NotificationBell';

interface CounselorDashboardLayoutProps {
  children: React.ReactNode;
}

export default function CounselorDashboardLayout({ children }: CounselorDashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { notifications } = useNotifications();
  const pathname = usePathname();

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/counselor/dashboard' },
    { icon: Users, label: 'Students', href: '/counselor/students' },
    { icon: Calendar, label: 'Appointments', href: '/counselor/appointments', type: 'appointment' },
    { icon: FileText, label: 'Assessments', href: '/counselor/assessments', type: 'assessment' },
    { icon: ClipboardList, label: 'Session Records', href: '/counselor/session-records' },
    { icon: MessageSquare, label: 'Messages', href: '/counselor/messages', type: 'message' },
  ];

  const getUnreadCount = (type?: string) => {
    if (!type) return 0;
    return notifications.filter(n => n.type === type && !n.isRead).length;
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Counselor Sidebar */}
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-8 sticky top-0 h-screen shrink-0 z-40">
        <div className="px-6 mb-12">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-headline">GuidanceSync</h2>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] pl-10 text-primary/80">Guidance Office</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const unreadCount = getUnreadCount(item.type);
            
            return (
              <Link 
                key={item.label} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-slate-400 hover:text-primary hover:bg-primary/5'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {unreadCount > 0 && (
                  <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-black animate-pulse shadow-sm ${isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'}`}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 mt-auto space-y-1 pt-6 border-t border-slate-50">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold text-slate-400 hover:text-primary transition-all text-left">
            <HelpCircle className="h-4 w-4" />
            Support Help
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold text-slate-400 hover:text-red-500 transition-all text-left"
          >
            <LogOut className="h-4 w-4" />
            Exit Portal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="relative w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search clinical records..."
              className="pl-10 h-10 bg-slate-50 border-none rounded-xl text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary transition-colors" asChild>
              <Link href="/counselor/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            
            <div className="pl-4 border-l border-slate-100 ml-2">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black leading-none text-slate-900">USPF Counselor</p>
                  <p className="text-[9px] text-primary uppercase font-bold tracking-tighter mt-0.5">Staff Account</p>
                </div>
                <Avatar className="h-9 w-9 ring-2 ring-primary/5">
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">C</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
