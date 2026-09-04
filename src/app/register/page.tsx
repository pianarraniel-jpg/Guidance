"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Scan,
  GraduationCap,
  ChevronLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export default function StudentRegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Basic validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide both your first name and last name.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@uspf.edu.ph')) {
      setError('Only official USPF university emails (@uspf.edu.ph) are permitted.');
      return;
    }

    const cleanId = studentId.trim();
    const studentIdRegex = /^(\d{4}-?\d{4,5}|\d{7,10})$/;
    if (!studentIdRegex.test(cleanId)) {
      setError('Invalid Student ID format. Example format: 202300958 or 2023-00958');
      return;
    }

    if (!department) {
      setError('Please select your college/department.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/student-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          studentId: cleanId,
          email: cleanEmail,
          department,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please check your information and try again.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Registration Successful!',
        description: `Welcome to GuidanceSync, ${firstName.trim()}! Redirecting to login...`,
      });

      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setError('An unexpected network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Branding Panel (Desktop) */}
      <div className="hidden lg:flex w-5/12 bg-primary p-12 flex-col justify-between relative text-primary-foreground">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-headline leading-tight">GuidanceSync</h1>
              <p className="text-xs opacity-80 uppercase tracking-widest font-semibold">USPF Student Portal</p>
            </div>
          </div>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold mb-6">
              <GraduationCap className="h-4 w-4" />
              <span>Official Student Enrollment</span>
            </div>

            <h2 className="text-4xl font-extrabold font-headline mb-5 leading-tight">
              Create your university wellness account
            </h2>
            <p className="text-base opacity-90 leading-relaxed mb-8">
              Access personalized counseling appointments, wellness assessments, secure real-time messaging with licensed counselors, and AI-guided mental health tools.
            </p>

            <div className="space-y-4 pt-4 border-t border-white/15">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium opacity-90">Department-matched guidance counselors</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium opacity-90">Instant login with your Student ID or University Email</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium opacity-90">Confidential and secure wellness records</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/15">
          <p className="text-xs font-medium opacity-75">
            University of Southern Philippines Foundation &bull; Guidance Office
          </p>
        </div>

        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/10 blur-3xl" />
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-10 lg:p-14 overflow-y-auto">
        <div className="w-full max-w-[540px] py-4">
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors group"
            >
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Sign In
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student Registration</h1>
            <p className="text-slate-500 text-sm mt-1">Fill in your university credentials to activate your account</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 rounded-xl border-none bg-red-50 text-red-600 py-3 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mr-2" />
              <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="firstName"
                    placeholder="e.g. Juan"
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary/20 font-medium text-sm"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="lastName"
                    placeholder="e.g. Dela Cruz"
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary/20 font-medium text-sm"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Student ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="studentId" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Student ID Number <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400 font-medium">Format: 202300958</span>
              </div>
              <div className="relative group">
                <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  id="studentId"
                  placeholder="e.g. 202300958"
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary/20 font-medium text-sm"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* University Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  University Email <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] font-semibold text-primary">@uspf.edu.ph</span>
              </div>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jdelacruz@uspf.edu.ph"
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary/20 font-medium text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Department / College <span className="text-red-500">*</span>
              </Label>
              <Select value={department} onValueChange={setDepartment} required>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-primary/20 font-medium text-sm">
                  <SelectValue placeholder="Select your department..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value} className="text-xs sm:text-sm py-2">
                      <span className="font-bold text-primary mr-2">[{dept.value}]</span>
                      <span>{dept.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary/20 font-medium text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary/20 font-medium text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Student Account..." : "Create Account"}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Sign in to your account
              </Link>
            </p>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                USPF Verified Portal
              </span>
              <span>&bull;</span>
              <span>256-bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
