"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShieldCheck, 
  ChevronLeft,
  Briefcase,
  Play
} from 'lucide-react';
import Link from 'next/link';

export default function CounselorLoginPage() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleQuickEntry = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // Hardcoded unified counselor credentials
      const success = await login('counselor@uspf.edu.ph', 'password123');
      if (success) {
        window.location.href = '/counselor/dashboard';
      } else {
        setError('Staff portal configuration error. Please contact IT.');
      }
    } catch (err) {
      setError('An unexpected error occurred during portal access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Link href="/login" className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors group">
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Student Portal
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 mb-6">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Portal</h1>
          <p className="text-slate-500 font-medium mt-2">Unified Guidance Office Access</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0 text-center">
             <div className="flex items-center justify-center gap-3 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">University Access Terminal</span>
             </div>
             <CardTitle className="text-xl font-black">USPF Counselor Login</CardTitle>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Identity</p>
              <h3 className="text-lg font-black text-primary">USPF Counselor</h3>
              <p className="text-[10px] text-slate-400 font-medium italic">Professional access restricted to authorized Guidance Office personnel.</p>
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl border-none bg-red-50 text-red-600 py-3">
                <AlertDescription className="text-xs font-bold text-center">{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleQuickEntry}
              className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1 group" 
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 fill-current" />
                <span className="text-lg">Launch Staff Dashboard</span>
              </div>
              <span className="text-[10px] opacity-70 group-hover:opacity-100 uppercase tracking-widest">Enter Guidance Workspace</span>
            </Button>

            <div className="pt-6 border-t border-slate-50 text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Terminal ID: GS-ADMIN-01</p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          University of Southern Philippines Foundation • GuidanceSync v1.2
        </p>
      </div>
    </div>
  );
}
