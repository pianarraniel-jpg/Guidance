"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Scan,
  Briefcase,
  AlertTriangle,
  Loader2,
  HeartHandshake,
  HelpCircle,
  PhoneCall,
} from 'lucide-react';
import Link from 'next/link';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';
import EmergencyCrisisDialog from '@/components/auth/EmergencyCrisisDialog';
import GoogleSsoModal from '@/components/auth/GoogleSsoModal';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isGoogleInfoOpen, setIsGoogleInfoOpen] = useState(false);

  const { login, loginWithId, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Load remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('uspf_saved_student_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  // Monitor Caps Lock
  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Persist or clear remembered email
      try {
        if (rememberMe) {
          localStorage.setItem('uspf_saved_student_email', email.trim());
        } else {
          localStorage.removeItem('uspf_saved_student_email');
        }
      } catch {}

      const res = await login(email.trim(), password.trim());
      if (res.success) {
        if (res.role === 'counselor') {
          router.push('/counselor/dashboard');
        } else if (res.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setError(res.error || 'Invalid credentials. Please verify your university email and password.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await loginWithId(studentId.trim());
      if (res.success) {
        if (res.role === 'counselor') {
          router.push('/counselor/dashboard');
        } else if (res.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setError(res.error || 'Student ID not recognized. Please check your USPF ID number.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during ID lookup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setIsGoogleInfoOpen(true);
      }
    } catch {
      setIsGoogleInfoOpen(true);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      {/* Left Panel: Branding & Storytelling */}
      <div className="hidden lg:flex w-1/2 bg-primary p-12 flex-col justify-between relative text-primary-foreground">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-24">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-headline leading-tight">GuidanceSync</h1>
              <p className="text-sm opacity-80">Supportive Wellness Portal</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-5xl font-bold font-headline mb-6 leading-tight">
              Your wellness journey starts with a conversation
            </h2>
            <p className="text-lg opacity-90 leading-relaxed mb-10">
              At USPF, we believe that mental health is the cornerstone of academic success and personal growth. Our platform bridges the gap between students and professional support.
            </p>

            <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 shadow-xl">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-primary bg-muted overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/${i + 50}/64/64`}
                      alt="Student"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium">Join 2,400+ students prioritizing wellness</p>
            </div>
          </div>
        </div>

        {/* 24/7 Crisis Hotline Fast-Access on Left Hero */}
        <div className="relative z-10 space-y-4">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 max-w-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-rose-200">In Crisis or Need Help Now?</p>
                <p className="text-xs font-medium text-white/90">24/7 National Center for Mental Health: <span className="font-bold underline">1553</span></p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCrisisOpen(true)}
              className="bg-white text-rose-600 hover:bg-white/90 font-black text-xs h-8 px-3 rounded-xl shadow-md shrink-0"
            >
              Get Help
            </Button>
          </div>

          <blockquote className="border-l-4 border-secondary pl-6 max-w-lg">
            <p className="text-lg italic opacity-90 mb-2">
              &quot;Wellness is not a luxury, but a fundamental right for every student in our community.&quot;
            </p>
            <footer className="text-sm font-bold opacity-80">— USPF Wellness Commission</footer>
          </blockquote>
        </div>

        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/10 blur-3xl" />
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-[440px] py-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-headline mb-2 text-slate-900">Welcome back</h1>
              <p className="text-muted-foreground text-sm">Sign in to your student wellness account</p>
            </div>
            <Link
              href="/login/counselor"
              className="flex flex-col items-center gap-1 group"
            >
              <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-all border border-slate-200/60 shadow-sm">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-primary">Staff Portal</span>
            </Link>
          </div>

          <Tabs defaultValue="standard" className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100/80 p-1 rounded-2xl">
              <TabsTrigger value="standard" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs py-2">
                University Email
              </TabsTrigger>
              <TabsTrigger value="id" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs py-2">
                Student ID
              </TabsTrigger>
            </TabsList>

            {/* Standard Email Login */}
            <TabsContent value="standard">
              <form onSubmit={handleStandardSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">University Email</Label>
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
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
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
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary transition-colors"
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
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(!!c)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label htmlFor="remember" className="text-xs font-medium leading-none text-muted-foreground cursor-pointer">
                      Remember this device
                    </label>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-2.5 rounded-xl border-none bg-red-50 text-red-600 animate-in fade-in slide-in-from-top-1">
                    <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Authenticating...
                    </>
                  ) : (
                    "Sign In to Wellness Portal"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Student ID Login */}
            <TabsContent value="id">
              <form onSubmit={handleIdSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student ID Number</Label>
                  <div className="relative group">
                    <Scan className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="studentId"
                      placeholder="e.g. 2024-0001 or 20240001"
                      className="pl-10 h-11 border-muted rounded-xl text-xs font-bold"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter the student ID issued on your USPF identification card.
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-2.5 rounded-xl border-none bg-red-50 text-red-600 animate-in fade-in slide-in-from-top-1">
                    <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying Student ID...
                    </>
                  ) : (
                    "Sign In with Student ID"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold text-[10px]">Institutional SSO</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting}
              className="w-full h-11 border-slate-200 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
            >
              {isGoogleSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Connecting to Google Workspace...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with University Google Account</span>
                </>
              )}
            </Button>

            <div className="pt-2">
              <p className="text-xs text-slate-600 font-medium">
                Don&apos;t have an account yet?{' '}
                <Link href="/register" className="font-bold text-primary hover:underline">
                  Register as Student
                </Link>
              </p>
            </div>

            {/* Emergency Hotline Button for Mobile/Responsive Users */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCrisisOpen(true)}
                className="w-full p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Need immediate support? 24/7 Crisis Hotlines</span>
              </button>
            </div>

            {/* Compliance Footer */}
            <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold space-y-1">
              <div className="flex items-center justify-center gap-4 uppercase tracking-widest text-slate-400/80">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> RA 10173 Protected
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HeartHandshake className="h-3 w-3 text-primary" /> RA 9258 Guidance Act
                </span>
              </div>
              <p className="font-normal text-slate-400">
                University of Southern Philippines Foundation • Guidance Services
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        defaultEmail={email}
        portalType="student"
      />

      {/* Emergency Crisis Support Dialog */}
      <EmergencyCrisisDialog
        isOpen={isCrisisOpen}
        onClose={() => setIsCrisisOpen(false)}
      />

      {/* Google SSO Status & Guidance Modal */}
      <GoogleSsoModal
        isOpen={isGoogleInfoOpen}
        onClose={() => setIsGoogleInfoOpen(false)}
        onUseEmail={() => {
          const emailInput = document.getElementById('email');
          if (emailInput) {
            emailInput.focus();
          }
        }}
      />
    </div>
  );
}
