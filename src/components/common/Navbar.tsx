"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Bell } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-headline text-xl font-bold text-primary">
            <span className="rounded-md bg-primary p-1 text-primary-foreground">GS</span>
            GuidanceSync
          </Link>
          
          <div className="hidden md:flex items-center gap-4">
            {/* Context-aware links would be injected here */}
            {user?.role === 'student' && (
              <>
                <Link href="/student/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</Link>
                <Link href="/student/book" className="text-sm font-medium hover:text-primary transition-colors">Book Session</Link>
                <Link href="/student/appointments" className="text-sm font-medium hover:text-primary transition-colors">My Appointments</Link>
                <Link href="/student/messages" className="text-sm font-medium hover:text-primary transition-colors">Messages</Link>
              </>
            )}
            {user?.role === 'counselor' && (
              <>
                <Link href="/counselor/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</Link>
                <Link href="/counselor/students" className="text-sm font-medium hover:text-primary transition-colors">Students</Link>
                <Link href="/counselor/session-notes" className="text-sm font-medium hover:text-primary transition-colors">Session Notes</Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link href="/admin/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Analytics</Link>
                <Link href="/admin/reports" className="text-sm font-medium hover:text-primary transition-colors">Reports</Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-secondary" />
          </Button>
          
          <div className="flex items-center gap-2 pl-4 border-l">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-bold leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
