
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  User,
  Heart,
  Menu,
  PhoneCall,
  Shield,
  ChevronRight,
} from 'lucide-react';
import logo from '@/app/assets/logo.png';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from '@/components/common/NotificationBell';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isStudent, isCounselor, isAdmin } = useAuth();
  const { notifications } = useNotifications();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getSidebarItems = () => {
    if (isStudent) {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/student/dashboard' },
        { icon: Calendar, label: 'Appointments', href: '/student/appointments', type: 'appointment' },
        { icon: CalendarPlus, label: 'Book Session', href: '/student/book' },
        { icon: ClipboardCheck, label: 'Student Tasks', href: '/student/assessments', type: 'assessment' },
        { icon: MessageSquare, label: 'Messages', href: '/student/messages', type: 'message' },
        { icon: FileText, label: 'Resources', href: '/student/resources' },
      ];
    }
    if (isCounselor) {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/counselor/dashboard' },
        { icon: Users, label: 'Students', href: '/counselor/students' },
        { icon: Calendar, label: 'Appointments', href: '/counselor/appointments', type: 'appointment' },
        { icon: FileText, label: 'Assessments', href: '/counselor/assessments', type: 'assessment' },
        { icon: Heart, label: 'Self-Care Protocols', href: '/counselor/self-care' },
        { icon: ClipboardCheck, label: 'Session Records', href: '/counselor/session-records' },
        { icon: MessageSquare, label: 'Messages', href: '/counselor/messages', type: 'message' },
      ];
    }
    if (isAdmin) {
      return [
        { icon: LayoutDashboard, label: 'Analytics', href: '/admin/dashboard' },
        { icon: FileText, label: 'Reports', href: '/admin/reports' },
        { icon: Sparkles, label: 'Resources Management', href: '/admin/resources' },
      ];
    }
    return [];
  };

  const sidebarItems = getSidebarItems();

  const getUnreadCount = (type?: string) => {
    if (!type) return 0;
    return notifications.filter(n => n.type === type && !n.isRead).length;
  };

  const getMobileBottomItems = () => {
    if (isStudent) {
      return [
        { icon: LayoutDashboard, label: 'Home', href: '/student/dashboard' },
        { icon: Calendar, label: 'Schedule', href: '/student/appointments', type: 'appointment' },
        { icon: CalendarPlus, label: 'Book', href: '/student/book', isAction: true },
        { icon: ClipboardCheck, label: 'Tasks', href: '/student/assessments', type: 'assessment' },
        { icon: MessageSquare, label: 'Chat', href: '/student/messages', type: 'message' },
      ];
    }
    if (isCounselor) {
      return [
        { icon: LayoutDashboard, label: 'Overview', href: '/counselor/dashboard' },
        { icon: Calendar, label: 'Queue', href: '/counselor/appointments', type: 'appointment' },
        { icon: Users, label: 'Students', href: '/counselor/students' },
        { icon: ClipboardCheck, label: 'Records', href: '/counselor/session-records' },
        { icon: MessageSquare, label: 'Chat', href: '/counselor/messages', type: 'message' },
      ];
    }
    return [];
  };

  const mobileBottomItems = getMobileBottomItems();
  const currentTitle = sidebarItems.find(i => pathname.startsWith(i.href))?.label || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] antialiased">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 hidden lg:flex flex-col py-6 sticky top-0 h-screen shrink-0 z-40">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <Image src={logo} alt="GuidanceSync Logo" className="h-8 w-8 object-contain" width={32} height={32} priority />
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-headline">GuidanceSync</h2>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider pl-10">Campus Wellness SaaS</p>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const unreadCount = getUnreadCount((item as any).type);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {unreadCount > 0 && (
                  <span className={`h-5 min-w-[20px] px-1.5 rounded-full text-[10px] flex items-center justify-center font-black shadow-xs ${
                    isActive ? 'bg-white text-primary' : 'bg-rose-500 text-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pt-3 border-t border-slate-100 space-y-1 mt-auto">
          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all text-left">
            <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Help Center</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all text-left"
          >
            <LogOut className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
        {/* Responsive Header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-slate-600 hover:bg-slate-100 rounded-xl h-10 w-10 -ml-1"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>

            <div className="flex items-center gap-2 lg:hidden">
              <Image src={logo} alt="GuidanceSync Logo" className="h-7 w-7 object-contain" width={28} height={28} />
              <span className="font-black text-slate-900 text-sm tracking-tight truncate max-w-[140px] sm:max-w-none">
                GuidanceSync
              </span>
            </div>

            <h2 className="hidden lg:block text-base font-black text-slate-900">
              {currentTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full h-9 w-9 sm:h-10 sm:w-10" asChild>
              <Link href={`/${user?.role}/settings`}>
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>

            <div className="pl-2 sm:pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-slate-900 leading-tight truncate max-w-[150px]">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {user?.role === 'student'
                      ? user?.department
                        ? `${user.department}${user.yearLevel ? ` • ${user.yearLevel}` : ''}`
                        : 'Student'
                      : user?.role === 'counselor' ? 'Counselor' : user?.role}
                  </p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8">
          {children}
        </main>

        {/* Mobile Slide-out Drawer */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-[82vw] max-w-xs p-0 border-r border-slate-200/80 bg-white flex flex-col">
            <SheetHeader className="p-5 border-b border-slate-100 text-left">
              <div className="flex items-center gap-2.5 mb-2">
                <Image src={logo} alt="GuidanceSync" className="h-7 w-7 object-contain" width={28} height={28} />
                <SheetTitle className="text-lg font-black text-slate-900 tracking-tight">GuidanceSync</SheetTitle>
              </div>
              <SheetDescription className="text-xs text-slate-500 font-medium">
                Campus Guidance & Wellness System
              </SheetDescription>

              {/* User mini profile card inside drawer */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
                    {user?.role === 'student' ? (user?.department || 'Student') : 'Guidance Counselor'}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {sidebarItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const unreadCount = getUnreadCount((item as any).type);

                return (
                  <SheetClose asChild key={item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {unreadCount > 0 && (
                        <span className={`h-5 min-w-[20px] px-1.5 rounded-full text-[10px] flex items-center justify-center font-black ${
                          isActive ? 'bg-white text-primary' : 'bg-rose-500 text-white'
                        }`}>
                          {unreadCount}
                        </span>
                      )}
                      <ChevronRight className={`h-3.5 w-3.5 opacity-40 ${isActive ? 'text-white' : ''}`} />
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>

            {/* Bottom actions in drawer */}
            <div className="p-4 border-t border-slate-100 space-y-2 mt-auto bg-slate-50/50">
              <SheetClose asChild>
                <Link
                  href={`/${user?.role}/settings`}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Account Settings
                </Link>
              </SheetClose>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all text-left"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Bottom Navigation Bar (Both Student & Counselor) */}
        {mobileBottomItems.length > 0 && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.03)] z-50 px-2 flex items-center justify-around">
            {mobileBottomItems.map((item: any) => {
              const isActive = pathname.startsWith(item.href);
              const unreadCount = getUnreadCount(item.type);

              if (item.isAction) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex flex-col items-center justify-center -mt-5 relative group"
                  >
                    <div className="h-11 w-11 rounded-2xl bg-primary text-white shadow-md shadow-primary/30 flex items-center justify-center transform active:scale-95 transition-all">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black text-primary mt-1">
                      {item.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all ${
                    isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75" />
                        <span className="relative min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] tracking-tight line-clamp-1 ${isActive ? 'font-black' : 'font-semibold'}`}>
                    {item.label}
                  </span>
                  {isActive && <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
