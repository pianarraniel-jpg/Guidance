"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import WebRTCMeetingRoom from '@/components/video/WebRTCMeetingRoom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, ArrowLeft, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function VirtualRoomPage() {
  const params = useParams();
  const appointmentId = params?.id as string;
  const router = useRouter();
  const { user, isCounselor, isStudent, isAdmin, isLoading: authLoading } = useAuth();

  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/room/${appointmentId}`);
      return;
    }

    const currentUser = user;

    async function loadAppointmentData() {
      setIsLoading(true);
      setError(null);
      try {
        const apt = await storageService.getById<any>(STORAGE_KEYS.APPOINTMENTS, appointmentId);
        if (!apt) {
          setError('Consultation appointment record not found or has been removed.');
          return;
        }

        // Authorization check: User must be the student, the counselor, or an admin
        const cId = apt.counselorId || apt.counselor_id;
        const sId = apt.studentId || apt.student_id;
        const isAuthorized = 
          isAdmin || 
          (cId && cId === currentUser.id) || 
          (sId && sId === currentUser.id) ||
          (currentUser.name && apt.studentName && currentUser.name.toLowerCase() === apt.studentName.toLowerCase()) ||
          (currentUser.name && apt.counselorName && currentUser.name.toLowerCase() === apt.counselorName.toLowerCase());

        if (!isAuthorized) {
          setError('You are not authorized to access this private consultation room.');
          return;
        }

        setAppointment(apt);
      } catch (err: any) {
        setError(err.message || 'Failed to load consultation appointment.');
      } finally {
        setIsLoading(false);
      }
    }

    if (appointmentId) {
      void loadAppointmentData();
    }
  }, [appointmentId, user, authLoading, isAdmin, router]);

  const handleLeaveRoom = () => {
    if (isCounselor) {
      router.push(`/counselor/appointments`);
    } else {
      router.push(`/student/appointments`);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3.5">
        <Loader2 className="h-9 w-9 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-300">
          Entering Guidance Virtual Room...
        </p>
      </div>
    );
  }

  if (error || !appointment) {
    const returnLink = isCounselor ? '/counselor/appointments' : '/student/appointments';
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-white shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Access Restricted</h2>
              <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                {error || 'Could not connect to this consultation room.'}
              </p>
            </div>
            <div className="pt-2">
              <Button asChild className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs gap-2">
                <Link href={returnLink}>
                  <ArrowLeft className="h-4 w-4" /> Return to Appointments
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <WebRTCMeetingRoom
      appointmentId={appointment.id}
      userId={user?.id || ''}
      userName={user?.name || (isCounselor ? 'Counselor' : 'Student')}
      userRole={isCounselor ? 'counselor' : (isStudent ? 'student' : 'admin')}
      appointment={appointment}
      onLeave={handleLeaveRoom}
    />
  );
}
