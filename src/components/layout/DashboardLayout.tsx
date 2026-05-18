
"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  ClipboardCheck,
  MessageSquare,
  FileText,
  HelpCircle,
  LogOut,
  Settings,
  Sparkles,
  Users,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from '@/components/common/NotificationBell';
import { useNotifications } from '@/contexts/NotificationContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isStudent, isCounselor, isAdmin } = useAuth();
  const { notifications } = useNotifications();
  const pathname = usePathname();
  const firstName = user?.name.split(' ')[0] || 'User';

  const getSidebarItems = () => {
    if (isStudent) {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/student/dashboard' },
        { icon: Calendar, label: 'Appointments', href: '/student/appointments', type: 'appointment' },
        { icon: CalendarPlus, label: 'Book Session', href: '/student/book' },
        { icon: ClipboardCheck, label: 'Clinical Tasks', href: '/student/assessments', type: 'assessment' },
        { icon: Sparkles, label: 'Guidi AI Chat', href: '/student/chat' },
        { icon: MessageSquare, label: 'Messages', href: '/student/messages', type: 'message' },
        { icon: FileText, label: 'Resources', href: '/student/resources' },
      ];
    }
    if (isCounselor) {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/counselor/dashboard' },
        { icon: Calendar, label: 'Appointments', href: '/counselor/appointments', type: 'appointment' },
        { icon: Users, label: 'Students', href: '/counselor/students' },
        { icon: ClipboardCheck, label: 'Session Notes', href: '/counselor/session-notes' },
      ];
    }
    if (isAdmin) {
      return [
        { icon: LayoutDashboard, label: 'Analytics', href: '/admin/dashboard' },
        { icon: FileText, label: 'Reports', href: '/admin/reports' },
      ];
    }
    return [];
  };

  const sidebarItems = getSidebarItems();

  const getUnreadCount = (type?: string) => {
    if (!type) return 0;
    return notifications.filter(n => n.type === type && !n.isRead).length;
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-6 sticky top-0 h-screen shrink-0 z-40">
        <div className="px-6 mb-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-primary font-headline">GuidanceSync</h2>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider pl-10">Supportive Wellness</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const unreadCount = getUnreadCount((item as any).type);

            return (
               <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all relative group ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-primary'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {unreadCount > 0 && (
                  <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-black animate-pulse shadow-sm ${
                    isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 space-y-2 mt-auto">
          {isStudent && (
            <Button asChild className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-lg flex items-center justify-start gap-3 h-11 mb-2 shadow-md">
              <Link href="/student/chat">
                <Sparkles className="h-5 w-5 animate-spin" />
                Guidi AI Companion
              </Link>
            </Button>
          )}
          <div className="space-y-1">
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
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        {/* Header */}
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="lg:hidden font-bold text-primary">GuidanceSync</h1>
            <h2 className="hidden lg:block text-lg font-bold text-[#1E293B]">
              {sidebarItems.find(i => pathname.startsWith(i.href))?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full h-10 w-10" asChild>
              <Link href={`/${user?.role}/settings`}>
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <div className="pl-4 border-l">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold leading-none">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
                </div>
                <Avatar className="h-9 w-9 ring-2 ring-primary/5">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.id}/64/64`} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">{firstName[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Students) */}
        {isStudent && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-200/60 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] z-50 px-2 flex items-center justify-around">
            {sidebarItems.slice(0, 5).map(item => {
              const isActive = pathname.startsWith(item.href);
              const unreadCount = getUnreadCount((item as any).type);
              const isAiChat = item.href === '/student/chat';

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all ${
                    isActive 
                      ? 'text-primary scale-105' 
                      : isAiChat 
                        ? 'text-emerald-600 hover:text-emerald-700' 
                        : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''} ${isAiChat ? 'animate-pulse' : ''}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold tracking-tight line-clamp-1">
                    {isAiChat ? 'Guidi AI' : item.label}
                  </span>
                  {isActive && <div className="absolute top-0 w-8 h-1 bg-primary rounded-full shadow-sm" />}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
