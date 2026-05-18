"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Shield, Key, Mail, Terminal } from 'lucide-react';


export default function CounselorSettings() {
  const { logout } = useAuth();

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-4xl font-bold font-headline text-slate-900 mb-2">Portal Settings</h1>
        <p className="text-muted-foreground">Managing the unified Guidance Office terminal configuration.</p>
      </header>

      <div className="space-y-6">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                <AvatarFallback className="text-2xl font-bold bg-primary text-white">C</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-bold">USPF Counselor</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-3 w-3" /> counselor@uspf.edu.ph
                </CardDescription>
              </div>
              <Badge className="ml-auto bg-primary/10 text-primary border-none px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">Unified Identity Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Guidance Office • University of Southern Philippines Foundation</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Terminal Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              This portal uses a shared professional identity for the Guidance Office. Password management and advanced security configurations are handled by the University IT Department.
            </p>
            <Button variant="outline" className="w-full font-bold h-12 rounded-xl text-xs uppercase tracking-widest">System Audit Logs</Button>
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
            Exit Staff Portal
          </Button>
        </div>
      </div>
    </div>
  );
}
