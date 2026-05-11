"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Shield, Key, Mail, Settings as SettingsIcon } from 'lucide-react';

export default function AdminSettings() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="text-4xl font-bold font-headline text-slate-900 mb-2">System Settings</h1>
            <p className="text-muted-foreground">Manage administrative controls and system-wide configurations.</p>
          </header>

          <div className="space-y-6">
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
                  <Button variant="outline" className="ml-auto font-bold rounded-xl">Edit Admin Profile</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                 <p className="text-sm text-muted-foreground">System Administrator • University of Southern Philippines Foundation</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                  System Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Administrative access to system logs and user management is restricted to authorized personnel.</p>
                <Button variant="outline" className="w-full font-bold">Manage Users</Button>
                <Button variant="outline" className="w-full font-bold">View System Audit Logs</Button>
              </CardContent>
            </Card>

            <div className="pt-6 flex flex-col items-center">
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full max-w-sm h-14 rounded-2xl font-black text-base shadow-xl shadow-red-500/20"
                onClick={logout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
