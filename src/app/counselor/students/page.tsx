"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, Trash2, ExternalLink, Users, Brain, TrendingUp, AlertCircle } from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, USER_ROLES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CounselorStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [assessmentsMap, setAssessmentsMap] = useState<Record<string, any[]>>({});
  const [insightsMap, setInsightsMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [profileStudent, setProfileStudent] = useState<any>(null);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [isEnrollSubmitting, setIsEnrollSubmitting] = useState(false);
  const { toast } = useToast();

  const loadStudents = async () => {
    const [allUsers, allAssessments, allInsights] = await Promise.all([
      storageService.getAll<any>(STORAGE_KEYS.USERS),
      storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
      storageService.getAll<any>(STORAGE_KEYS.AI_INSIGHTS),
    ]);

    const studentList = allUsers.filter(u => u.role === USER_ROLES.STUDENT);
    setStudents(studentList);

    // Map assessments per student
    const aMap: Record<string, any[]> = {};
    for (const a of allAssessments) {
      if (!aMap[a.studentId]) aMap[a.studentId] = [];
      aMap[a.studentId].push(a);
    }
    Object.values(aMap).forEach(list => list.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
    setAssessmentsMap(aMap);

    // Map latest insight per student
    const iMap: Record<string, string> = {};
    for (const ins of allInsights) {
      iMap[ins.studentId] = ins.insight;
    }
    setInsightsMap(iMap);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleEnrollSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnrollError('');
    setIsEnrollSubmitting(true);

    const name = enrollName.trim();
    const email = enrollEmail.trim().toLowerCase();
    const studentId = enrollStudentId.trim();

    if (!name || !email || !studentId) {
      setEnrollError('Please complete all enrollment fields.');
      setIsEnrollSubmitting(false);
      return;
    }

    if (!email.endsWith('@uspf.edu.ph')) {
      setEnrollError('Student email must use the official @uspf.edu.ph domain.');
      setIsEnrollSubmitting(false);
      return;
    }

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        setEnrollError('A profile already exists for this email.');
        setIsEnrollSubmitting(false);
        return;
      }

      const { data: existingStudentId } = await supabase
        .from('profiles')
        .select('id')
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingStudentId) {
        setEnrollError('This Student ID is already registered.');
        setIsEnrollSubmitting(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: studentId,
      });

      if (signUpError || !data.user) {
        setEnrollError(signUpError?.message || 'Enrollment failed. Please try again.');
        setIsEnrollSubmitting(false);
        return;
      }

      await supabase
        .from('profiles')
        .update({ name, role: USER_ROLES.STUDENT, student_id: studentId })
        .eq('id', data.user.id);

      toast({
        title: 'Student Enrolled',
        description: `${name} has been added to the student directory.`,
      });

      setIsEnrollDialogOpen(false);
      setEnrollName('');
      setEnrollEmail('');
      setEnrollStudentId('');
      loadStudents();
    } catch (err) {
      console.error(err);
      setEnrollError('Unable to enroll student. Please try again.');
    } finally {
      setIsEnrollSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    await storageService.delete(STORAGE_KEYS.USERS, id);
    toast({
      title: "Record Removed",
      description: "The student wellness profile has been deactivated.",
    });
    loadStudents();
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId?.includes(searchTerm) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWellnessLabel = (stressLevel?: number) => {
    if (stressLevel == null) return { label: 'No data', color: 'bg-slate-100 text-slate-400' };
    if (stressLevel > 75) return { label: 'At Risk', color: 'bg-red-50 text-red-600' };
    if (stressLevel > 50) return { label: 'Moderate', color: 'bg-amber-50 text-amber-600' };
    return { label: 'Stable', color: 'bg-emerald-50 text-emerald-600' };
  };

  const profileAssessments = profileStudent ? (assessmentsMap[profileStudent.id] ?? []) : [];
  const profileInsight = profileStudent ? insightsMap[profileStudent.id] : null;
  const latestAssessment = profileAssessments[0];
  const avgStress = profileAssessments.length > 0
    ? Math.round(profileAssessments.slice(0, 5).reduce((s, a) => s + (a.stressLevel ?? 50), 0) / Math.min(5, profileAssessments.length))
    : null;

  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Student Directory</h1>
          <p className="text-slate-500 font-medium">Monitoring wellness profiles for the USPF community.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name or student ID..."
              className="pl-10 h-12 w-[300px] bg-white border-none shadow-sm rounded-2xl text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.25em] shadow-lg shadow-primary/10 hover:bg-primary/90">
                Create / Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[2rem] p-6 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Create / Enroll Student</DialogTitle>
                <DialogDescription className="mt-2 text-sm text-slate-500">
                  Add a new wellness student account using their official USPF credentials.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEnrollSubmit} className="mt-6 space-y-5">
                {enrollError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-red-700 text-xs font-bold">
                    {enrollError}
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="enrollName" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input
                    id="enrollName"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="enrollEmail" className="text-xs font-black uppercase tracking-wider text-muted-foreground">University Email</Label>
                  <Input
                    id="enrollEmail"
                    type="email"
                    placeholder="student@uspf.edu.ph"
                    value={enrollEmail}
                    onChange={(e) => setEnrollEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="enrollStudentId" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Student ID</Label>
                  <Input
                    id="enrollStudentId"
                    type="text"
                    placeholder="2024-0001"
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-slate-400">The student ID will also be used as the initial login password.</p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl transition-all active:scale-[0.98]"
                  disabled={isEnrollSubmitting}
                >
                  {isEnrollSubmitting ? 'Enrolling...' : 'Enroll Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="bg-primary/5 px-4 h-12 rounded-2xl flex items-center gap-2 border border-primary/10">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-black text-primary">{students.length} Enrolled</span>
          </div>
        </div>
      </header>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden mb-10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pl-8">Student</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">ID Number</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">University Email</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">Wellness Status</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pr-8 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const latestA = assessmentsMap[student.id]?.[0];
                const { label, color } = getWellnessLabel(latestA?.stressLevel ?? student.latestStressLevel);
                return (
                  <TableRow key={student.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                          <AvatarImage src={`https://picsum.photos/seed/${student.id}/64/64`} />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">{student.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{student.name}</span>
                          {latestA?.emotionalState && (
                            <span className="text-[10px] text-slate-400 font-bold capitalize">{latestA.emotionalState}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg bg-slate-50 border-none font-black text-[10px] uppercase px-3 py-1 text-slate-500">
                        {student.studentId || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-600">{student.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-none font-black text-[9px] uppercase ${color}`}>{label}</Badge>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 group-hover:text-primary">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-slate-100 shadow-xl">
                          <DropdownMenuItem
                            onSelect={() => setProfileStudent(student)}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-4 w-4 text-slate-400" /> Clinical Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleDeleteStudent(student.id)}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" /> Deactivate Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                      <p className="font-bold text-sm italic">No students found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clinical Profile Modal */}
      <Dialog open={!!profileStudent} onOpenChange={(open) => !open && setProfileStudent(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                <AvatarImage src={`https://picsum.photos/seed/${profileStudent?.id}/128/128`} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{profileStudent?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900">{profileStudent?.name}</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {profileStudent?.studentId || profileStudent?.email}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Avg Stress</p>
                <p className="text-2xl font-black text-slate-900">{avgStress != null ? `${avgStress}%` : '--'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Sessions</p>
                <p className="text-2xl font-black text-slate-900">{profileAssessments.length}</p>
              </div>
              <div className={`p-4 rounded-2xl border text-center ${avgStress != null ? getWellnessLabel(avgStress).color : 'bg-slate-50 text-slate-400'}`}>
                <p className="text-[9px] font-black uppercase opacity-60 mb-2">Status</p>
                <p className="text-2xl font-black">{avgStress != null ? getWellnessLabel(avgStress).label : 'No Data'}</p>
              </div>
            </div>

            {/* AI Insight */}
            {profileInsight && (
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5" /> Latest AI Insight
                </p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{profileInsight}"</p>
              </div>
            )}

            {/* Latest emotional state + concerns */}
            {latestAssessment?.emotionalState && (
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Latest Assessment Analytics</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border-none font-bold text-xs capitalize">
                    {latestAssessment.emotionalState}
                  </Badge>
                  {latestAssessment.mainConcerns?.map((c: string, i: number) => (
                    <Badge key={i} className="bg-amber-50 text-amber-700 border-none font-bold text-xs capitalize">{c}</Badge>
                  ))}
                  {latestAssessment.focusAreas?.map((f: string, i: number) => (
                    <Badge key={i} className="bg-blue-50 text-blue-700 border-none font-bold text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment history */}
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" /> Assessment History
              </p>
              {profileAssessments.length > 0 ? (
                <div className="space-y-2">
                  {profileAssessments.slice(0, 6).map((a, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shrink-0">
                        <span className={`text-[10px] font-black ${a.stressLevel > 75 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {a.stressLevel ?? '--'}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {a.type === 'AI_CHAT' ? 'AI Chat' : 'Clinical Form'} — {a.date}
                        </p>
                        {a.emotionalState && (
                          <p className="text-[10px] text-slate-400 font-bold capitalize">{a.emotionalState}</p>
                        )}
                      </div>
                      <Badge className={`border-none text-[8px] font-black uppercase shrink-0 ${a.status === 'evaluated' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic font-bold">No assessments recorded yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
