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
  AlertTriangle,
  PhoneCall,
  HeartHandshake,
  Building2,
  Clock,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

interface EmergencyCrisisDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmergencyCrisisDialog({ isOpen, onClose }: EmergencyCrisisDialogProps) {
  const hotlines = [
    {
      name: 'National Center for Mental Health (NCMH)',
      badge: '24/7 Toll-Free Hotline',
      number: '1553',
      altNumber: '0917-899-8727 (USAP)',
      type: 'Government Crisis Line',
    },
    {
      name: 'Hopeline Philippines',
      badge: '24/7 Crisis Support',
      number: '0917-558-4673',
      altNumber: '0918-873-4673',
      type: 'Nationwide Support',
    },
    {
      name: 'USPF Guidance Office & Health Clinic',
      badge: 'Campus Services',
      number: '(032) 414-7777',
      altNumber: 'Room 302, USPF Main Campus',
      type: 'University Support',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-br from-rose-50 via-red-50/50 to-white border-b border-rose-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[9px] uppercase tracking-wider">
                  Emergency Support
                </Badge>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <Clock className="h-3 w-3 text-emerald-600" /> 24/7 Available
                </span>
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 mt-1">
                You Are Not Alone
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                If you or someone you know is in immediate distress, free and confidential support is available right now.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-4">
          <div className="space-y-3">
            {hotlines.map((h) => (
              <div
                key={h.name}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-rose-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{h.name}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {h.badge} • {h.altNumber}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 shrink-0"
                >
                  <a href={`tel:${h.number.replace(/[^0-9]/g, '')}`}>
                    <PhoneCall className="h-3.5 w-3.5 mr-1.5" /> Call {h.number}
                  </a>
                </Button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-3">
            <HeartHandshake className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">USPF Guidance Promise</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                You do not need to be logged into your account to receive guidance assistance. Walk-ins are warmly welcomed at Room 302 during campus hours.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-11 rounded-xl font-bold border-slate-200 text-slate-600"
            >
              Close Emergency Hotlines
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
