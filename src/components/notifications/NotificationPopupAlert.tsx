"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  X, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useNotifications, type PopupAlert } from '@/contexts/NotificationContext';

// Gentle dual-tone web audio chime for pleasant feedback without audio assets
function playSoftNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.09, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.46);
  } catch {
    // Graceful fallback if user hasn't interacted or audio context blocked
  }
}

export default function NotificationPopupAlert() {
  const { activePopup, dismissPopupAlert, markAsRead } = useNotifications();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play gentle chime whenever a new popup arrives
  useEffect(() => {
    if (activePopup) {
      playSoftNotificationChime();
      setProgress(100);
    }
  }, [activePopup]);

  // Handle auto-dismiss with progress bar (paused on hover)
  useEffect(() => {
    if (!activePopup) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const DURATION = 6500; // 6.5s
    const INTERVAL = 50;

    if (!isHovered) {
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingPct = Math.max(0, 100 - (elapsed / DURATION) * 100);
        setProgress(remainingPct);
        if (remainingPct <= 0) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          dismissPopupAlert();
        }
      }, INTERVAL);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [activePopup, isHovered, dismissPopupAlert]);

  if (!activePopup) return null;

  const handleAction = () => {
    if (activePopup.id && activePopup.type !== 'appointment') {
      markAsRead(activePopup.id);
    }
    const targetLink = activePopup.link;
    dismissPopupAlert();
    if (targetLink) {
      router.push(targetLink);
    }
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'appointment':
        return {
          icon: Calendar,
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dotColor: 'bg-blue-500',
          category: 'Consultation & Schedule',
        };
      case 'assessment':
        return {
          icon: ClipboardList,
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dotColor: 'bg-emerald-500',
          category: 'Assessment & Wellness',
        };
      case 'message':
        return {
          icon: MessageSquare,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dotColor: 'bg-amber-500',
          category: 'Chat Message',
        };
      default:
        return {
          icon: Bell,
          badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          dotColor: 'bg-primary',
          category: 'Guidance Notification',
        };
    }
  };

  const { icon: TypeIcon, badgeColor, dotColor, category } = getIconConfig(activePopup.type);

  return (
    <aside 
      aria-label="Notification alert"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-4 sm:p-4.5 transition-all hover:shadow-slate-200/50">
        {/* Subtle timer progress line */}
        <div 
          className="absolute top-0 left-0 h-1 bg-primary transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-start gap-3.5">
          {/* Notification Icon with pulsating live dot */}
          <div className="relative shrink-0 mt-0.5">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${badgeColor} shadow-2xs`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
            </span>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">
                {category}
              </span>
              <span className="text-[9px] text-slate-300">•</span>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                Live Alert
              </span>
            </div>

            <h4 className="text-xs font-black text-slate-900 leading-snug tracking-tight">
              {activePopup.title}
            </h4>

            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed line-clamp-2">
              {activePopup.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-primary hover:bg-primary/90 text-white shadow-xs transition-colors"
              >
                <span>View Details</span>
                <ExternalLink className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={dismissPopupAlert}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={dismissPopupAlert}
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
