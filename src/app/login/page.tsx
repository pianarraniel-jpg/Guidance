"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Scan,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithId } = useAuth();
  const router = useRouter();

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/');
      } else {
        setError('Invalid credentials. Use student@uspf.edu.ph / password123');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await loginWithId(studentId);
      if (success) {
        router.push('/');
      } else {
        setError('Student ID not found. Try: 2024-0001');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
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
              <p className="text-sm opacity-80">Supportive Wellness</p>
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

        <div className="relative z-10">
          <blockquote className="border-l-4 border-secondary pl-6 max-w-lg">
            <p className="text-lg italic opacity-90 mb-2">
              "Wellness is not a luxury, but a fundamental right for every student in our community."
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-headline mb-2">Welcome back</h1>
              <p className="text-muted-foreground text-sm">Sign in to your student wellness account</p>
            </div>
            <Link
              href="/login/counselor"
              className="flex flex-col items-center gap-1 group"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-primary">Staff Entry</span>
            </Link>
          </div>

          <Tabs defaultValue="standard" className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1">
              <TabsTrigger value="standard" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Standard Login
              </TabsTrigger>
              <TabsTrigger value="id" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Student ID
              </TabsTrigger>
            </TabsList>

            <TabsContent value="standard">
              <form onSubmit={handleStandardSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">University Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@uspf.edu.ph"
                      className="pl-10 h-11 border-muted"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                    <Button variant="link" className="p-0 h-auto text-primary text-xs font-bold" type="button">Forgot password?</Button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11 border-muted"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label htmlFor="remember" className="text-sm font-medium leading-none text-muted-foreground cursor-pointer">
                    Remember this device
                  </label>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-2 animate-in fade-in slide-in-from-top-1">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold text-base transition-all active:scale-[0.98]" disabled={isSubmitting}>
                  {isSubmitting ? "Authenticating..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="id">
              <form onSubmit={handleIdSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student ID Number</Label>
                  <div className="relative group">
                    <Scan className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="studentId"
                      placeholder="e.g. 2024-0001"
                      className="pl-10 h-11 border-muted"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-2 animate-in fade-in slide-in-from-top-1">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold text-base transition-all active:scale-[0.98]" disabled={isSubmitting}>
                  {isSubmitting ? "Checking ID..." : "Sign In with ID"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground font-medium">OR</span>
              </div>
            </div>

            <Button variant="outline" className="w-full h-11 border-muted hover:bg-muted/30 font-medium">
              Sign in with University Google Account
            </Button>

            <div className="pt-8 flex items-center justify-center gap-6 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" />
                <span>University Protocol</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                <span>Secure Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
