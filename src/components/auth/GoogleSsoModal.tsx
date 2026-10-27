"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';

interface GoogleSsoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseEmail: () => void;
}

export default function GoogleSsoModal({
  isOpen,
  onClose,
  onUseEmail,
}: GoogleSsoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-br from-slate-50 via-sky-50/30 to-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center shrink-0">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
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
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-100 text-sky-800 border-none font-black text-[9px] uppercase tracking-wider">
                  Google Workspace SSO
                </Badge>
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 mt-1">
                USPF Google Sign-In
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-5">
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-sky-900">
              <Info className="h-4 w-4 text-sky-600 shrink-0" />
              <span>Provider Activation Notice</span>
            </div>
            <p className="text-xs text-sky-800 leading-relaxed font-medium">
              Google Workspace Single Sign-On requires configuring the Google OAuth Provider in the backend Supabase dashboard (<code className="bg-sky-100 px-1 rounded text-[11px]">Authentication → Providers → Google</code>).
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Direct Sign-In Available:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>University Email</span>
              </span>
              <span className="text-slate-400 font-semibold text-[11px]">name@uspf.edu.ph</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span>Student ID Number</span>
              </span>
              <span className="text-slate-400 font-semibold text-[11px]">e.g. 2024-0001</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => {
                onClose();
                onUseEmail();
              }}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md shadow-primary/20"
            >
              Sign In with University Credentials
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-11 rounded-xl font-bold border-slate-200 text-xs text-slate-600"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
