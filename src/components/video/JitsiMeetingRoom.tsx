"use client";

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  LogOut,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Loader2,
  Sparkles
} from 'lucide-react';

interface JitsiMeetingRoomProps {
  roomName: string;
  displayName: string;
  email?: string;
  userRole?: 'counselor' | 'student' | 'admin';
  appointment: any;
  onLeave: () => void;
}

export default function JitsiMeetingRoom({
  roomName,
  displayName,
  email,
  userRole = 'student',
  appointment,
  onLeave,
}: JitsiMeetingRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if Jitsi API script is already on window
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).JitsiMeetExternalAPI) {
      setIsScriptLoaded(true);
    }
  }, []);

  // Initialize Jitsi Meet IFrame when script is loaded and container is ready
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current) return;

    // Clean up previous instance if any
    if (apiRef.current) {
      try {
        apiRef.current.dispose();
      } catch (e) {
        console.warn('Error disposing previous Jitsi instance:', e);
      }
      apiRef.current = null;
    }

    try {
      const roleLabel = userRole === 'counselor' ? 'Counselor' : 'Student';
      const formattedDisplayName = `${displayName || 'User'} (${roleLabel})`;

      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: formattedDisplayName,
          email: email || '',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          enableClosePage: false,
          enableWelcomePage: false,
          defaultLanguage: 'en',
          subject: `USPF Guidance Consultation • ${appointment?.type || 'Session'}`,
          toolbarButtons: [
            'camera',
            'microphone',
            'desktop',
            'chat',
            'raisehand',
            'tileview',
            'select-background',
            'fullscreen',
            'settings',
            'videoquality',
            'hangup',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TOOLBAR_ALWAYS_VISIBLE: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        },
      };

      const api = new (window as any).JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;

      api.addEventListener('videoConferenceJoined', () => {
        setIsJoined(true);
      });

      api.addEventListener('videoConferenceLeft', () => {
        setIsJoined(false);
        onLeave();
      });

      api.addEventListener('readyToClose', () => {
        onLeave();
      });
    } catch (err) {
      console.error('Failed to initialize Jitsi Meet instance:', err);
    }

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (e) {
          console.warn('Error during Jitsi dispose cleanup:', e);
        }
        apiRef.current = null;
      }
    };
  }, [isScriptLoaded, roomName, displayName, email, userRole, appointment, onLeave]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleHangupAndLeave = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('hangup');
      } catch {
        onLeave();
      }
    } else {
      onLeave();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden select-none">
      <Script
        src="https://meet.jit.si/external_api.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
        onError={(e) => console.error('Failed to load Jitsi Meet script:', e)}
      />

      {/* Top Consultation App Bar */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
            <Video className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                Guidance Virtual Consultation
              </h1>
              <Badge className="hidden sm:inline-flex bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 shadow-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                Live Jitsi Room
              </Badge>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              {appointment?.type || 'Consultation Session'} • {appointment?.studentName || 'Student'} & {appointment?.counselorName || 'Counselor'}
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-bold">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>{appointment?.date || 'Today'}</span>
            <span className="text-slate-600">•</span>
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{appointment?.time || 'Scheduled'}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-9 w-9 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <Button
            onClick={handleHangupAndLeave}
            className="h-9 px-3.5 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Leave Session</span>
          </Button>
        </div>
      </header>

      {/* Main Jitsi Container */}
      <main className="flex-1 relative w-full h-full bg-slate-950">
        {!isScriptLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-slate-300">
              Connecting to secure Guidance Sync virtual room...
            </p>
            <p className="text-[11px] text-slate-500">
              Powered by Jitsi Meet Open-Source Telehealth Engine
            </p>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '100%' }}
        />
      </main>
    </div>
  );
}
