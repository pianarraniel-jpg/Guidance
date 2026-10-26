"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Shield, Mail, Terminal, Building2, UserCheck, Lock } from 'lucide-react';

export default function CounselorSettings() {
  const { user, logout } = useAuth();

  const counselorName = user?.name || 'USPF Counselor';
  const counselorEmail = user?.email || 'counselor@uspf.edu.ph';
  const departmentName = user?.department || 'General Guidance Office';
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'C';

  return (
    <div className="p-8 w-full max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold font-headline text-slate-900 mb-2">Portal Settings</h1>
        <p className="text-muted-foreground">Managing your counselor account and guidance terminal configuration.</p>
      </header>

      <div className="space-y-6">
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                <AvatarFallback className="text-2xl font-bold bg-primary text-white">{userInitial}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">{counselorName}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1 text-slate-500 font-medium">
                  <Mail className="h-3.5 w-3.5" /> {counselorEmail}
                </CardDescription>
              </div>
              <Badge className="sm:ml-auto bg-primary/10 text-primary border-none px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest w-fit">
                {user?.department ? `${user.department} Counselor` : 'Staff Account Active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Department</p>
                  <p className="text-sm font-bold text-slate-900">{departmentName}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Role</p>
                  <p className="text-sm font-bold text-slate-900 capitalize">{user?.role || 'Counselor'} Personnel</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-2">Guidance Office • University of Southern Philippines Foundation</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Terminal & Security Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Your staff terminal is securely authenticated to the USPF Guidance Network. Password management, multi-factor security, and system auditing are managed by the University IT Department.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Active End-to-End Encrypted Session</span>
            </div>
          </CardContent>
        </Card>

        <div className="pt-6 flex flex-col items-center">
          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full max-w-sm h-14 rounded-2xl font-black text-base shadow-xl shadow-red-500/20 active:scale-[0.98] transition-all"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Exit Staff Portal
          </Button>
        </div>
      </div>
    </div>
  );
}
