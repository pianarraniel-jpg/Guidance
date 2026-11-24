"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  Maximize2,
  Minimize2,
  MessageSquare,
  Users,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Send,
  X,
  User,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

interface WebRTCMeetingRoomProps {
  appointmentId: string;
  userId: string;
  userName: string;
  userRole: 'counselor' | 'student' | 'admin';
  appointment: any;
  onLeave: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export default function WebRTCMeetingRoom({
  appointmentId,
  userId,
  userName,
  userRole,
  appointment,
  onLeave,
}: WebRTCMeetingRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC references
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const channelRef = useRef<any>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // State
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'waiting' | 'connected' | 'failed'>('connecting');
  const [peerName, setPeerName] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Counselor is the "polite" peer or initiator depending on role
  const isInitiator = userRole === 'counselor';

  // 1. Initialize Local Media Stream
  useEffect(() => {
    let mounted = true;

    async function startMedia() {
      try {
        setMediaError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Could not get audio+video, trying audio-only fallback:', err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!mounted) {
            audioStream.getTracks().forEach(t => t.stop());
            return;
          }
          localStreamRef.current = audioStream;
          setIsVideoMuted(true);
        } catch (audioErr: any) {
          if (mounted) {
            setMediaError('Could not access camera or microphone. Please check your browser permissions.');
          }
        }
      }
    }

    void startMedia();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
    };
  }, []);

  // 2. Set up WebRTC Peer Connection & Signaling
  useEffect(() => {
    if (!localStreamRef.current && !mediaError) return;

    const channel = supabase.channel(`webrtc-room-${appointmentId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const createPeerConnection = () => {
      if (pcRef.current) return pcRef.current;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming remote media tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setConnectionState('connected');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void channel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              type: 'candidate',
              candidate: event.candidate.toJSON(),
              senderId: userId,
              senderName: userName,
              senderRole: userRole,
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectionState('connected');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionState('waiting');
        }
      };

      return pc;
    };

    // Signaling listener
    channel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
      if (!payload || payload.senderId === userId) return;

      if (payload.senderName) {
        setPeerName(payload.senderName);
      }

      const pc = createPeerConnection();

      try {
        if (payload.type === 'peer-joined') {
          // A peer announced arrival, initiator creates the offer
          if (isInitiator) {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            void channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'offer',
                sdp: offer,
                senderId: userId,
                senderName: userName,
                senderRole: userRole,
              },
            });
          } else {
            // Non-initiator responds with handshake ping so initiator knows we are ready
            void channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'peer-ready',
                senderId: userId,
                senderName: userName,
                senderRole: userRole,
              },
            });
          }
        } else if (payload.type === 'peer-ready') {
          if (isInitiator) {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            void channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'offer',
                sdp: offer,
                senderId: userId,
                senderName: userName,
                senderRole: userRole,
              },
            });
          }
        } else if (payload.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

          // Drain queued candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          void channel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              type: 'answer',
              sdp: answer,
              senderId: userId,
              senderName: userName,
              senderRole: userRole,
            },
          });
        } else if (payload.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

          // Drain queued candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } else if (payload.type === 'candidate' && payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidatesQueue.current.push(payload.candidate);
          }
        } else if (payload.type === 'chat') {
          setChatMessages(prev => [...prev, {
            id: `msg-${Date.now()}-${Math.random()}`,
            senderName: payload.senderName || 'Participant',
            senderRole: payload.senderRole || '',
            text: payload.text || '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
        } else if (payload.type === 'peer-left') {
          setPeerName(null);
          setConnectionState('waiting');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        }
      } catch (signalErr) {
        console.error('Error handling WebRTC signal:', signalErr);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('waiting');
        // Announce presence
        void channel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type: 'peer-joined',
            senderId: userId,
            senderName: userName,
            senderRole: userRole,
          },
        });
      }
    });

    return () => {
      // Announce leave
      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: { type: 'peer-left', senderId: userId },
        });
        supabase.removeChannel(channelRef.current);
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [appointmentId, userId, userName, userRole, isInitiator, mediaError]);

  // Scroll chat on new message
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Audio Toggle
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!audioTracks[0]?.enabled);
    }
  };

  // Video Toggle
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!videoTracks[0]?.enabled);
    }
  };

  // Screen Sharing Toggle
  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          void toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.warn('Screen sharing cancelled or denied:', e);
      }
    }
  };

  // Send In-Room Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || !channelRef.current) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderName: userName,
      senderRole: userRole,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, newMsg]);
    setInputMessage('');

    void channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: {
        type: 'chat',
        text,
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
      },
    });
  };

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

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden select-none font-sans">
      {/* Top Session Header */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
            <Video className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                Guidance Virtual Consultation
              </h1>
              {connectionState === 'connected' ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 shadow-none inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  P2P Connected
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 shadow-none inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  Waiting for peer...
                </Badge>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              {appointment?.type || 'Consultation Session'} • {appointment?.studentName || 'Student'} & {appointment?.counselorName || 'Counselor'}
            </p>
          </div>
        </div>

        {/* Top Right Controls */}
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
            onClick={() => setIsChatOpen(!isChatOpen)}
            variant="outline"
            className={`h-9 px-3 rounded-xl font-bold text-xs border-slate-700 gap-1.5 ${
              isChatOpen ? 'bg-primary/20 text-primary border-primary/40' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chat</span>
            {chatMessages.length > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-black text-white flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main Video Conference Area */}
      <div className="flex-1 relative flex overflow-hidden">
        <main className="flex-1 relative bg-slate-950 flex items-center justify-center p-3 sm:p-4">
          {mediaError && (
            <div className="absolute top-4 left-4 right-4 z-40 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 max-w-lg mx-auto">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{mediaError}</span>
            </div>
          )}

          {/* Video Stage Container */}
          <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
            {/* Remote Video Feed (Primary) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                connectionState === 'connected' ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Waiting Placeholder when no remote peer is connected */}
            {connectionState !== 'connected' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-xl">
                    <User className="h-10 w-10 text-slate-400" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
                  </span>
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-sm font-black text-white">
                    {userRole === 'counselor' ? 'Waiting for Student to Join...' : 'Waiting for Counselor to Join...'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {userRole === 'counselor'
                      ? `${appointment?.studentName || 'The student'} has received the session invitation link. The video call will connect automatically once they enter.`
                      : `${appointment?.counselorName || 'Your counselor'} will join shortly for your scheduled consultation.`}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] font-bold text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Secure 1-on-1 End-to-End Encrypted WebRTC Room</span>
                </div>
              </div>
            )}

            {/* Remote User Label Tag */}
            {connectionState === 'connected' && (
              <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{peerName || (userRole === 'counselor' ? appointment?.studentName : appointment?.counselorName) || 'Participant'}</span>
              </div>
            )}

            {/* Local Video Picture-in-Picture (Draggable / Positioned) */}
            <div className="absolute bottom-4 right-4 z-20 w-36 h-24 sm:w-56 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 shadow-2xl transition-all">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  isVideoMuted ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {isVideoMuted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-1">
                  <VideoOff className="h-5 w-5 text-slate-500" />
                  <span className="text-[9px] font-bold text-slate-500">Camera Off</span>
                </div>
              )}

              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-bold text-white bg-slate-950/70 backdrop-blur-sm px-2 py-0.5 rounded-md">
                <span className="truncate">You ({userRole})</span>
                {isAudioMuted && <MicOff className="h-2.5 w-2.5 text-rose-400 shrink-0" />}
              </div>
            </div>
          </div>
        </main>

        {/* In-Call Text Chat Drawer */}
        {isChatOpen && (
          <aside className="w-80 sm:w-88 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-20 animate-in slide-in-from-right duration-200 shrink-0">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Consultation Chat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">No messages yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Use this chat to exchange messages, reference links, or notes during your consultation.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderName === userName;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-300">{msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl text-xs max-w-[85%] break-words ${
                        isMe
                          ? 'bg-primary text-white font-medium rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none font-medium'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
              <Input
                type="text"
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="h-10 bg-slate-950 border-slate-700 text-xs font-medium text-white focus-visible:ring-primary"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputMessage.trim()}
                className="h-10 w-10 bg-primary hover:bg-primary/90 text-white rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </aside>
        )}
      </div>

      {/* Floating Bottom Call Controls Bar */}
      <footer className="h-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-center px-4 z-30 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Microphone Mute Toggle */}
          <Button
            onClick={toggleAudio}
            variant={isAudioMuted ? 'destructive' : 'outline'}
            size="icon"
            className={`h-12 w-12 rounded-2xl transition-all shadow-md ${
              isAudioMuted
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Camera On / Off Toggle */}
          <Button
            onClick={toggleVideo}
            variant={isVideoMuted ? 'destructive' : 'outline'}
            size="icon"
            className={`h-12 w-12 rounded-2xl transition-all shadow-md ${
              isVideoMuted
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          {/* Screen Share Toggle */}
          <Button
            onClick={toggleScreenShare}
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-2xl transition-all shadow-md ${
              isScreenSharing
                ? 'bg-sky-600 border-sky-500 text-white hover:bg-sky-700 shadow-sky-600/20'
                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
          >
            <ScreenShare className="h-5 w-5" />
          </Button>

          {/* End Call Button */}
          <Button
            onClick={onLeave}
            className="h-12 px-6 rounded-2xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 gap-2 ml-2 sm:ml-4"
          >
            <PhoneOff className="h-5 w-5" />
            <span>End Consultation</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}
