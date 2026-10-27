"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  KeyRound,
  Mail,
  Loader2,
  CheckCircle2,
  Building2,
  HelpCircle,
} from 'lucide-react';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  portalType?: 'student' | 'counselor';
}

export default function ForgotPasswordDialog({
  isOpen,
  onClose,
  defaultEmail = '',
  portalType = 'student',
}: ForgotPasswordDialogProps) {
  const { resetPassword } = useAuth();
  const [resetEmail, setResetEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Update email if defaultEmail changes
  React.useEffect(() => {
    if (defaultEmail) setResetEmail(defaultEmail);
  }, [defaultEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const res = await resetPassword(resetEmail.trim());
      if (res.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(res.error || 'Unable to send reset email. Please verify your address.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900">
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Recover access to your USPF {portalType === 'counselor' ? 'Counselor Terminal' : 'Student Portal'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-5">
          {status === 'success' ? (
            <div className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-black text-emerald-900">
                  Password Reset Dispatched
                </h4>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  We sent a secure password recovery link to{' '}
                  <span className="font-bold underline">{resetEmail}</span>. Please check your inbox and spam folder.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Alternative On-Campus Reset</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Students may also visit Room 302 (USPF Guidance Office) or the IT Department with their student ID card for an instant credential reset.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleClose}
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your university-registered email address. We will verify your account and send a secure reset link.
              </p>

              {status === 'error' && (
                <Alert variant="destructive" className="py-2.5 rounded-xl border-none bg-red-50 text-red-600">
                  <AlertDescription className="text-xs font-bold">{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  University Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@uspf.edu.ph"
                    className="pl-10 h-11 border-muted"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
                <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  For students who registered with their Student ID only, please contact your college guidance counselor at Room 302.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !resetEmail.trim()}
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md shadow-primary/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Dispatching Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="h-11 rounded-xl font-bold border-slate-200 text-xs px-4"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
