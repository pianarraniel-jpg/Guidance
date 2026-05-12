"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, USER_ROLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  IdCard,
  ChevronLeft,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function CounselorRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validation: Domain Check
    if (!email.toLowerCase().endsWith('@uspf.edu.ph')) {
      setError('Only official USPF staff emails (@uspf.edu.ph) are permitted for counselor registration.');
      setIsSubmitting(false);
      return;
    }

    // Validation: Length Check
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);
    
    // Check if email or staffId already exists
    const emailExists = allUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    const idExists = allUsers.some(u => u.staffId === staffId || u.studentId === staffId);

    if (emailExists) {
      setError('This email is already registered. Please sign in instead.');
      setIsSubmitting(false);
      return;
    }

    if (idExists) {
      setError('This Staff ID is already registered in our system.');
      setIsSubmitting(false);
      return;
    }

    const newCounselor = {
      name,
      email,
      staffId,
      password,
      role: USER_ROLES.COUNSELOR,
      createdAt: new Date().toISOString()
    };

    try {
      storageService.create(STORAGE_KEYS.USERS, newCounselor);
      
      toast({
        title: "Registration Successful",
        description: `Welcome to the team, Dr. ${name.split(' ').pop()}! Redirecting to login...`,
      });

      // Redirect to login after a short delay
      setTimeout(() => router.push('/login/counselor'), 2000);
    } catch (err) {
      setError('An error occurred while creating your account. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Link href="/login/counselor" className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors group">
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Staff Login
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 mb-6">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Enrollment</h1>
          <p className="text-slate-500 font-medium mt-2">Create your professional GuidanceSync account</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0">
             <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">University Credential Verification</span>
             </div>
             <CardTitle className="text-xl font-black">Register Counselor</CardTitle>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="e.g. Dr. Maria Santos"
                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-primary/20 font-medium"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">University Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input 
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
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Staff ID Number</Label>
                <div className="relative group">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="e.g. CS-2024-001"
                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-primary/20 font-medium"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-primary/20 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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
                {isSubmitting ? "Processing..." : "Complete Registration"}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-50 text-center">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Support & Verification</p>
               <div className="flex justify-center gap-6">
                  <button className="text-xs font-bold text-slate-600 hover:text-primary transition-colors">Credential Help</button>
                  <button className="text-xs font-bold text-slate-600 hover:text-primary transition-colors">Contact Admin</button>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}