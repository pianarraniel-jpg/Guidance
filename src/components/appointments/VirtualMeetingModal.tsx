"use client";

import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Sparkles,
  ClipboardPaste,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { extractMeetingUrl } from '@/lib/appointment-utils';

interface VirtualMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onConfirm: (appointmentId: string, meetingLink: string) => Promise<void>;
}

export default function VirtualMeetingModal({
  isOpen,
  onClose,
  appointment,
  onConfirm,
}: VirtualMeetingModalProps) {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      const existing = extractMeetingUrl(appointment.location) || '';
      setMeetingUrl(existing);
      setError(null);
    } else {
      setMeetingUrl('');
      setError(null);
    }
  }, [appointment, isOpen]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMeetingUrl(text.trim());
        setError(null);
      }
    } catch {
      // Clipboard access not granted, user can type manually
    }
  };

  const handleGenerateMeet = () => {
    // Generate an institutional USPF consultation Meet code
    const randCode = Math.random().toString(36).substring(2, 5) + '-' +
                     Math.random().toString(36).substring(2, 6) + '-' +
                     Math.random().toString(36).substring(2, 5);
    setMeetingUrl(`https://meet.google.com/${randCode}`);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = meetingUrl.trim();
    if (!cleaned) {
      setError('Please provide a virtual meeting link before confirming.');
      return;
    }

    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `https://${cleaned}`;
    }

    if (!cleaned.includes('.') || cleaned.length < 10) {
      setError('Please enter a valid meeting URL (e.g. https://meet.google.com/xxx-yyyy-zzz).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(appointment.id, cleaned);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 sm:p-7 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                Confirm Virtual Consultation
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Provide a virtual meeting link. The student will immediately receive a confirmation email with this link attached.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          {/* Appointment Context Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Session Details
              </span>
              <Badge className="bg-sky-50 text-sky-700 border border-sky-100 font-bold text-[9px] uppercase px-2 py-0.5 shadow-none">
                <Video className="h-3 w-3 mr-1" /> Virtual Modality
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-900 truncate">{appointment.studentName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-900">{appointment.date}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-900">{appointment.time}</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 truncate">
                {appointment.type}
              </div>
            </div>
          </div>

          {/* Meeting Link Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meetingUrl" className="text-xs font-black uppercase tracking-wider text-slate-700">
                Virtual Meeting Link (URL) <span className="text-rose-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateMeet}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> Generate Meet
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  <ClipboardPaste className="h-3 w-3" /> Paste
                </button>
              </div>
            </div>

            <div className="relative">
              <Input
                id="meetingUrl"
                type="text"
                value={meetingUrl}
                onChange={(e) => { setMeetingUrl(e.target.value); setError(null); }}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                className="h-11 rounded-xl text-xs font-bold text-slate-900 bg-white border-slate-200 focus-visible:ring-blue-500 pr-10"
                autoFocus
              />
              {meetingUrl && (
                <a
                  href={meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-3 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Test link in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Accepts Google Meet, Zoom, Microsoft Teams, or any valid tele-consultation URL.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 px-5 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !meetingUrl.trim()}
              className="h-11 px-6 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Confirming & Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Confirm & Send Link</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
