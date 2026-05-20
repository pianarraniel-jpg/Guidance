"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { storageService } from '@/lib/storage-service';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  Timer,
  MapPin,
  FileText,
  Target,
  Radio,
  AlertTriangle,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLiveSync } from '@/hooks/useLiveSync';
import BreathingExerciseModal from '@/components/wellness/BreathingExerciseModal';


type TabKey = 'upcoming' | 'history' | 'all';

export default function StudentAppointments() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Guided Breathing Modal States
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);
  const [modalDuration, setModalDuration] = useState(300);
  const [modalTitle, setModalTitle] = useState('Mindfulness Breathing');

  // Use a ref so the realtime callback always calls the latest version
  const loadRef = useRef<() => void>(() => {});

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    const [data, allFeedback] = await Promise.all([
      storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id),
      storageService.getByField<any>('appointment_feedback', 'studentId', user.id),
    ]);

    // Sort feedback descending so we always get the latest one if there are duplicates
    const sortedFeedback = allFeedback.sort((a: any, b: any) => 
      new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
    );

    const enrichedData = data.map((app: any) => {
      const fb = sortedFeedback.find((f: any) => f.appointmentId === app.id || f.appointment_id === app.id);
      if (fb && fb.feedback) {
        try {
          const parsed = JSON.parse(fb.feedback);
          if (parsed.actionItems) app.actionItems = parsed.actionItems;
          if (parsed.counselorNotes) app.counselorNotes = parsed.counselorNotes;
        } catch(e) {
          app.counselorNotes = fb.feedback;
        }
      }
      return app;
    });

    enrichedData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAppointments(enrichedData);
  }, [user]);

  useEffect(() => { loadRef.current = loadAppointments; }, [loadAppointments]);

  useEffect(() => {
    if (!user) return;
    loadAppointments();
  }, [user, loadAppointments]);

  useLiveSync(() => {
    setIsLive(true);
    setTimeout(() => setIsLive(false), 3000);
    loadRef.current();
  });


  // Auto-clear appointment notifications when viewing this page
  useEffect(() => {
    const unread = notifications.filter(n => n.type === 'appointment' && !n.isRead);
    if (unread.length > 0) unread.forEach(n => markAsRead(n.id));
  }, [notifications, markAsRead]);

  const today = startOfDay(new Date());

  const filtered = (() => {
    switch (activeTab) {
      case 'upcoming':
        return appointments.filter(a =>
          (a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.PENDING) &&
          !isBefore(parseISO(a.date), today)
        );
      case 'history':
        return appointments.filter(a =>
          a.status === 'completed' || a.status === 'cancelled' || isBefore(parseISO(a.date), today)
        );
      default:
        return appointments;
    }
  })();

  const stats = [
    { label: 'Total', value: appointments.length, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Upcoming', value: appointments.filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED && !isBefore(parseISO(a.date), today)).length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending', value: appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).length, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case APPOINTMENT_STATUS.CONFIRMED:
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1 text-[10px] py-1 px-2.5 rounded-lg shadow-sm">
            <CheckCircle2 className="h-3 w-3" /> Confirmed
          </Badge>
        );
      case APPOINTMENT_STATUS.PENDING:
        return (
          <Badge variant="outline" className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 font-bold gap-1 text-[10px] py-1 px-2.5 rounded-lg">
            <Clock className="h-3 w-3" /> Pending Review
          </Badge>
        );
      case APPOINTMENT_STATUS.CANCELLED:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold gap-1 text-[10px] py-1 px-2.5 rounded-lg">
            <XCircle className="h-3 w-3" /> Cancelled
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-600 text-white font-bold gap-1 text-[10px] py-1 px-2.5 rounded-lg shadow-sm">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        );
      default:
        return <Badge className="text-[10px] uppercase font-bold py-1 px-2.5 rounded-lg">{status}</Badge>;
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget || isCancelling) return;
    setIsCancelling(true);
    try {
      await storageService.update(STORAGE_KEYS.APPOINTMENTS, cancelTarget.id, {
        status: APPOINTMENT_STATUS.CANCELLED,
        lastUpdate: Date.now()
      });

      toast({
        title: 'Session Cancelled',
        description: 'Your counselor has been notified.',
      });

      setCancelTarget(null);
      loadAppointments();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not cancel session.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const confirmedDates = appointments
    .filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED)
    .map(a => { try { return parseISO(a.date); } catch { return null; } })
    .filter(Boolean) as Date[];

  const tabs: { key: TabKey; label: string; count: number }[] = [
    {
      key: 'upcoming',
      label: 'Upcoming Sessions',
      count: appointments.filter(
        a => (a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.PENDING) && !isBefore(parseISO(a.date), today)
      ).length,
    },
    {
      key: 'history',
      label: 'Past & Records',
      count: appointments.filter(
        a => a.status === 'completed' || a.status === 'cancelled' || isBefore(parseISO(a.date), today)
      ).length,
    },
    { key: 'all', label: 'All Sessions', count: appointments.length },
  ];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-6xl mx-auto w-full min-h-screen">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Appointments</h1>
                {isLive && (
                  <Badge className="bg-emerald-500 text-white animate-pulse text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                    <Radio className="h-3 w-3 mr-1 inline" /> Live Sync
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-medium">Manage your clinical sessions and review completed appointment feedback.</p>
            </div>
            <Button asChild className="rounded-2xl font-black bg-primary h-12 px-6 shadow-xl shadow-primary/20 hover:scale-105 transition-all">
              <Link href="/student/book">
                <Plus className="h-5 w-5 mr-2" /> Book New Session
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main list */}
            <div className="lg:col-span-8">
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                {/* Tab bar */}
                <div className="px-6 pt-6 border-b border-slate-100 flex items-center gap-1">
                  {tabs.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        activeTab === t.key
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span className={`h-4 min-w-[16px] rounded-full text-[9px] flex items-center justify-center px-1 ${
                          activeTab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>{t.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-3 text-center px-8">
                      <CalendarIcon className="h-8 w-8 text-slate-100" />
                      <p className="text-sm font-bold text-slate-300">
                        {activeTab === 'upcoming' ? 'No upcoming sessions.' : 'No records found.'}
                      </p>
                      {activeTab === 'upcoming' && (
                        <Button asChild size="sm" className="mt-1 font-bold rounded-xl">
                          <Link href="/student/book">Book a Session</Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {filtered.map(app => (
                        <div
                          key={app.id}
                          className={`flex items-center gap-4 px-6 py-5 hover:bg-slate-50/50 transition-all group ${
                            app.status === APPOINTMENT_STATUS.PENDING ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Date block */}
                          <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-primary">
                              {format(parseISO(app.date), 'MMM')}
                            </span>
                            <span className="text-xl font-black text-slate-900 leading-none">
                              {format(parseISO(app.date), 'dd')}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-black text-slate-900 truncate">{app.type}</p>
                              {getStatusBadge(app.status)}
                            </div>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-3">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{app.time}</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.location || 'Room 302'}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground font-bold mt-1">
                              with {app.counselorName}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedApp(app); setIsDetailsOpen(true); }}
                              className="h-8 text-[10px] font-black text-slate-400 hover:text-primary rounded-xl"
                            >
                              View
                            </Button>
                            {(app.status === APPOINTMENT_STATUS.PENDING || app.status === APPOINTMENT_STATUS.CONFIRMED) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancelTarget(app)}
                                className="h-8 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Calendar */}
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-6 pb-3">
                  <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" /> Schedule View
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 flex flex-col items-center">
                  <Calendar
                    mode="multiple"
                    selected={confirmedDates}
                    className="w-full"
                    modifiers={{ confirmed: confirmedDates }}
                    modifiersClassNames={{
                      confirmed: 'bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-sm'
                    }}
                  />
                  <div className="w-full mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-emerald-500 shrink-0" />
                    <p className="text-[10px] text-slate-400 font-medium">Confirmed sessions are highlighted in green.</p>
                  </div>
                </CardContent>
              </Card>

              {/* CTA card */}
              <Card className="border-none shadow-lg bg-primary rounded-[2rem] p-6 text-white overflow-hidden relative group">
                <div className="relative z-10">
                  <h3 className="font-black text-lg mb-2">Need Support?</h3>
                  <p className="text-xs text-white/80 font-medium mb-4">Chat with Guidi AI before your session to clarify your thoughts.</p>
                  <Button asChild variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-black">
                    <Link href="/student/chat">Launch Guidi</Link>
                  </Button>
                </div>
                <Timer className="absolute -bottom-4 -right-4 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform" />
              </Card>
            </div>
          </div>
        </div>

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-lg rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-6 bg-slate-50 border-b">
              <DialogTitle className="text-xl font-black">{selectedApp?.type}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(selectedApp?.status)}
                <span className="text-[10px] font-bold text-slate-400 uppercase">#{selectedApp?.id?.slice(-6).toUpperCase()}</span>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Date</p>
                  <p className="text-sm font-bold text-slate-900">{selectedApp?.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Time</p>
                  <p className="text-sm font-bold text-slate-900">{selectedApp?.time}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Counselor</p>
                  <p className="text-sm font-bold text-slate-900">{selectedApp?.counselorName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                  <p className="text-sm font-bold text-slate-900">{selectedApp?.location || 'Room 302'}</p>
                </div>
              </div>
              {selectedApp?.reason && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Target className="h-3 w-3" /> Your Reason</p>
                  <p className="text-sm font-medium text-slate-600 italic">"{selectedApp.reason}"</p>
                </div>
              )}
              {selectedApp?.status === 'completed' && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Counselor Session Feedback
                    </p>
                    <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]">Official Record</Badge>
                  </div>
                  <p className="text-xs font-semibold text-emerald-950 leading-relaxed italic mb-4">
                    "{selectedApp.counselorNotes || selectedApp.counselorComments || selectedApp.feedback || 'Session completed successfully. Student actively engaged in therapeutic dialogue and agreed to follow recommended wellness protocols.'}"
                  </p>
                  {selectedApp.actionItems && selectedApp.actionItems.length > 0 && (
                    <div className="pt-3 border-t border-emerald-200/60 space-y-2">
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Recommended Actions</p>
                      {selectedApp.actionItems.map((act: string, idx: number) => {
                        const isExercise = /(breath|meditat|calm|mindful|inhale|exhale|relax)/i.test(act);
                        return (
                          <div key={idx} className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900 bg-emerald-100/35 px-3 py-2 rounded-xl border border-emerald-200/30">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                              <span className="truncate">{act}</span>
                            </div>
                            {isExercise && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  // Close details modal to focus on the exercise
                                  setIsDetailsOpen(false);
                                  // Parse duration
                                  const match = act.match(/(\d+)\s*(min|minute)/i);
                                  const mins = match ? parseInt(match[1], 10) : 5;
                                  setModalDuration(mins * 60);
                                  setModalTitle(act);
                                  setIsBreathingModalOpen(true);
                                }}
                                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                              >
                                <Play className="h-2.5 w-2.5 fill-current" /> Start
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                {(selectedApp?.status === APPOINTMENT_STATUS.PENDING || selectedApp?.status === APPOINTMENT_STATUS.CONFIRMED) && (
                  <Button
                    variant="outline"
                    onClick={() => { setIsDetailsOpen(false); setCancelTarget(selectedApp); }}
                    className="flex-1 h-11 rounded-xl font-bold text-red-500 border-red-100 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="flex-1 h-11 rounded-xl font-bold border-slate-200">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
          <DialogContent className="max-w-sm rounded-[2rem] border-none shadow-2xl p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-black mb-2">Cancel Session?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium mb-6">
              This will cancel your <strong>{cancelTarget?.type}</strong> on <strong>{cancelTarget?.date}</strong> at <strong>{cancelTarget?.time}</strong>. This action cannot be undone.
            </DialogDescription>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCancelTarget(null)} className="flex-1 h-11 rounded-xl font-bold">Keep it</Button>
              <Button onClick={handleCancel} disabled={isCancelling} className="flex-1 h-11 rounded-xl font-black bg-red-500 hover:bg-red-600 text-white">
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Guided Breathing Exercise Modal */}
        <BreathingExerciseModal
          isOpen={isBreathingModalOpen}
          onClose={() => setIsBreathingModalOpen(false)}
          duration={modalDuration}
          title={modalTitle}
          onComplete={() => {
            toast({
              title: "Session Action Item Completed!",
              description: "You've successfully completed this counselor recommended exercise.",
            });
          }}
        />

      </DashboardLayout>
    </ProtectedRoute>
  );
}
