"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldCheck,
  ChevronLeft,
  Briefcase,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  AlertTriangle,
  LockKeyhole,
} from 'lucide-react';
import Link from 'next/link';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';

export default function CounselorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const router = useRouter();

  // Load remembered staff email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('uspf_saved_counselor_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // Monitor Caps Lock
  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Persist or clear remembered staff email
      try {
        if (rememberMe) {
          localStorage.setItem('uspf_saved_counselor_email', email.trim());
        } else {
          localStorage.removeItem('uspf_saved_counselor_email');
        }
      } catch {}

      const res = await login(email.trim(), password.trim());
      if (res.success) {
        if (res.role === 'student') {
          // Student attempted to access Counselor Terminal
          await logout();
          setError('This account is registered as a student. Please use the Student Portal to sign in.');
          return;
        }

        if (res.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/counselor/dashboard');
        }
      } else {
        setError(res.error || 'Invalid staff credentials. Please check your email and password.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during portal access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Link
        href="/login"
        className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors group"
      >
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Student Portal
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 mb-6">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Portal</h1>
          <p className="text-slate-500 font-medium mt-2">Unified Guidance Office Access Terminal</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Authorized Personnel Only</span>
            </div>
            <CardTitle className="text-xl font-black">USPF Counselor Login</CardTitle>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl border-none bg-red-50 text-red-600 py-3">
                  <AlertDescription className="text-xs font-bold text-center leading-relaxed">
                    {error}
                    {error.includes('student') && (
                      <div className="mt-2">
                        <Link
                          href="/login"
                          className="inline-block px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase"
                        >
                          Go to Student Portal →
                        </Link>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Staff Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@uspf.edu.ph"
                    className="pl-10 h-11 border-muted rounded-xl text-xs font-bold"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="p-0 h-auto text-primary text-xs font-bold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 border-muted rounded-xl text-xs font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyModifier}
                    onKeyUp={handleKeyModifier}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isCapsLockOn && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 animate-in fade-in">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Caps Lock is ON</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-counselor"
                    checked={rememberMe}
                    onCheckedChange={(c) => setRememberMe(!!c)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="remember-counselor" className="text-xs font-medium leading-none text-muted-foreground cursor-pointer">
                    Remember this device
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying Terminal Access...
                  </>
                ) : (
                  'Sign In to Staff Terminal'
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <LockKeyhole className="h-3 w-3 text-emerald-600" /> 256-bit Encrypted
              </span>
              <span>Terminal ID: GS-ADMIN-01</span>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          University of Southern Philippines Foundation • GuidanceSync v1.2
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        defaultEmail={email}
        portalType="counselor"
      />
    </div>
  );
}
