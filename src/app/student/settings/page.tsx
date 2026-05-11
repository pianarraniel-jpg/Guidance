"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Bell, Shield, Key, Mail, Fingerprint } from 'lucide-react';

export default function StudentSettings() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="text-4xl font-bold font-headline text-slate-900 mb-2">Account Settings</h1>
            <p className="text-muted-foreground">Manage your personal information and security preferences.</p>
          </header>

          <div className="space-y-6">
            {/* Profile Section */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b pb-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                    <AvatarImage src={`https://picsum.photos/seed/${user?.id}/128/128`} />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-white">{user?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl font-bold">{user?.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Mail className="h-3 w-3" /> {user?.email}
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="ml-auto font-bold rounded-xl">Edit Profile</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student ID</p>
                    <p className="font-bold text-slate-700">{user?.studentId || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Role</p>
                    <p className="font-bold text-slate-700 capitalize">{user?.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Change Password</p>
                      <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-primary group-hover:underline">Update</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-primary group-hover:underline">Enable</Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Choose how you want to receive appointment reminders and wellness tips.</p>
                  <Button variant="outline" className="w-full font-bold rounded-xl h-11">Configure Notifications</Button>
                </div>
              </CardContent>
            </Card>

            {/* Logout Section */}
            <div className="pt-6 flex flex-col items-center">
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full max-w-sm h-14 rounded-2xl font-black text-base shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                Sign Out of GuidanceSync
              </Button>
              <p className="mt-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Version 1.2.0 • HIPAA Compliant Environment
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
