"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  ChevronLeft,
  Briefcase,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

export default function CounselorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (success) {
        window.location.href = '/counselor/dashboard';
      } else {
        setError('Invalid staff credentials. Use your USPF staff email or password.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
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
          <p className="text-slate-500 font-medium mt-2">Professional Access for USPF Counselors</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0">
             <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Secure Authentication</span>
             </div>
             <CardTitle className="text-xl font-black">Counselor Login</CardTitle>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400">University Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email"
                    type="email"
                    placeholder="counselor@uspf.edu.ph"
                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-primary/20 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-400">Password</Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-14 pl-12 pr-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-primary/20 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-xl border-none bg-red-50 text-red-600 py-3">
                  <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Authenticating..." : "Sign In to Portal"}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-50 text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">New to GuidanceSync?</p>
               <Link href="/register/counselor" className="text-sm font-black text-primary hover:underline flex items-center justify-center gap-2 mb-8">
                 <UserPlus className="h-4 w-4" /> Register as Staff
               </Link>

               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Staff Support</p>
               <div className="flex justify-center gap-6">
                  <button className="text-xs font-bold text-slate-600 hover:text-primary transition-colors">Reset Password</button>
                  <button className="text-xs font-bold text-slate-600 hover:text-primary transition-colors">IT Helpdesk</button>
               </div>
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
