"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, User as UserIcon, Lock, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (success) {
        // AuthContext handles state updates, just need to wait for redirect check or force it
        window.location.href = '/'; 
      } else {
        setError('Invalid credentials. Please use mock accounts from documentation.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (role: string) => {
    const credentials = {
      student: { email: 'student@uspf.edu.ph', pass: 'password123' },
      counselor: { email: 'counselor@uspf.edu.ph', pass: 'password123' },
      admin: { email: 'admin@uspf.edu.ph', pass: 'password123' },
    }[role as keyof typeof credentials];
    
    if (credentials) {
      setEmail(credentials.email);
      setPassword(credentials.pass);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F5F4] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">GuidanceSync</h1>
          <p className="mt-2 text-sm text-muted-foreground">University of Southern Philippines Foundation</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to access your wellness dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Institutional Email</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@uspf.edu.ph" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t pt-4">
            <div className="w-full text-center text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Quick Test Access
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => handleQuickLogin('student')} className="text-[10px] h-8">
                Student
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickLogin('counselor')} className="text-[10px] h-8">
                Counselor
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickLogin('admin')} className="text-[10px] h-8">
                Admin
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account? <Button variant="link" className="p-0 h-auto text-primary font-bold">Request Access</Button>
        </p>
      </div>
    </div>
  );
}
