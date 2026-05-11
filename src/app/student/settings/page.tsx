"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LogOut, 
  User, 
  Bell, 
  Shield, 
  Key, 
  Mail, 
  Fingerprint, 
  ShieldCheck, 
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';

export default function StudentSettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let password = uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)]; // Ensure starts with uppercase
    for (let i = 0; i < 7; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewPassword(password);
    setConfirmPassword(password);
    toast({
      title: "Strong Password Suggested",
      description: `Generated: ${password}`,
    });
  };

  const handlePasswordUpdate = () => {
    // Validation
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    const firstChar = newPassword.charAt(0);
    if (firstChar !== firstChar.toUpperCase() || !/[A-Z]/.test(firstChar)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Password must start with an uppercase letter.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Mismatch",
        description: "New passwords do not match.",
      });
      return;
    }

    // Update in Storage
    if (user) {
      storageService.update(STORAGE_KEYS.USERS, user.id, { password: newPassword });
      toast({
        title: "Password Updated",
        description: "Your security credentials have been refreshed.",
      });
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="text-4xl font-bold font-headline text-slate-900 mb-2">Account Settings</h1>
            <p className="text-muted-foreground">Manage your personal information and security preferences.</p>
          </header>

          <div className="space-y-6">
            {/* Profile Section */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b pb-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                    <AvatarImage src={`https://picsum.photos/seed/${user?.id}/128/128`} />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-white">{user?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl font-bold">{user?.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Mail className="h-3 w-3" /> {user?.email}
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="ml-auto font-bold rounded-xl">Edit Profile</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student ID</p>
                    <p className="font-bold text-slate-700">{user?.studentId || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Role</p>
                    <p className="font-bold text-slate-700 capitalize">{user?.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Key className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Change Password</p>
                          <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="font-bold text-primary group-hover:underline">Update</Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl max-w-md">
                    <DialogHeader>
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <DialogTitle className="text-2xl font-black">Change Password</DialogTitle>
                      <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        University Security Protocol
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Password</Label>
                        <Input 
                          type="password"
                          placeholder="••••••••" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-12 rounded-xl bg-slate-50 border-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Password</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={generateStrongPassword}
                            className="h-6 text-[9px] font-black text-primary uppercase gap-1 hover:bg-primary/5 rounded-lg"
                          >
                            <Sparkles className="h-3 w-3" /> Suggest Strong
                          </Button>
                        </div>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-12 rounded-xl bg-slate-50 border-none pr-10"
                          />
                          <button 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-2">
                           <div className="flex items-center gap-1.5">
                              {newPassword.length >= 6 ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-slate-300" />}
                              <span className={`text-[9px] font-bold uppercase ${newPassword.length >= 6 ? 'text-emerald-600' : 'text-slate-400'}`}>Min 6 Characters</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              {(newPassword.length > 0 && newPassword.charAt(0) === newPassword.charAt(0).toUpperCase() && /[A-Z]/.test(newPassword.charAt(0))) ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-slate-300" />}
                              <span className={`text-[9px] font-bold uppercase ${(newPassword.length > 0 && newPassword.charAt(0) === newPassword.charAt(0).toUpperCase() && /[A-Z]/.test(newPassword.charAt(0))) ? 'text-emerald-600' : 'text-slate-400'}`}>Starts with Uppercase</span>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confirm Password</Label>
                        <Input 
                          type="password"
                          placeholder="••••••••" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`h-12 rounded-xl border-none ${confirmPassword && newPassword !== confirmPassword ? 'bg-red-50' : 'bg-slate-50'}`}
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-4">
                      <Button 
                        onClick={handlePasswordUpdate} 
                        className="w-full h-14 rounded-2xl bg-primary font-black shadow-lg shadow-primary/20"
                        disabled={!newPassword || newPassword !== confirmPassword}
                      >
                        Update Security Credentials
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-primary group-hover:underline">Enable</Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Choose how you want to receive appointment reminders and wellness tips.</p>
                  <Button variant="outline" className="w-full font-bold rounded-xl h-11">Configure Notifications</Button>
                </div>
              </CardContent>
            </Card>

            {/* Logout Section */}
            <div className="pt-6 flex flex-col items-center">
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full max-w-sm h-14 rounded-2xl font-black text-base shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                Sign Out of GuidanceSync
              </Button>
              <p className="mt-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Version 1.2.0 • HIPAA Compliant Environment
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
