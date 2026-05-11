"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  UserPlus, 
  Mail, 
  IdCard, 
  MoreVertical, 
  ShieldCheck,
  Filter,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, USER_ROLES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CounselorStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const { toast } = useToast();

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');

  const loadStudents = () => {
    const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);
    const studentList = allUsers.filter(u => u.role === USER_ROLES.STUDENT);
    setStudents(studentList);
  };

  useEffect(() => {
    loadStudents();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USERS) loadStudents();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName || !newEmail || !newStudentId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required student details.",
      });
      return;
    }

    if (!newEmail.endsWith('@uspf.edu.ph')) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Only USPF university emails (@uspf.edu.ph) are permitted.",
      });
      return;
    }

    const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);
    const exists = allUsers.some(u => u.email === newEmail || u.studentId === newStudentId);

    if (exists) {
      toast({
        variant: "destructive",
        title: "Duplicate Record",
        description: "A student with this Email or ID already exists in the system.",
      });
      return;
    }

    const newStudent = {
      name: newName,
      email: newEmail,
      studentId: newStudentId,
      password: 'password123', // Default password for first login
      role: USER_ROLES.STUDENT,
      createdAt: new Date().toISOString()
    };

    storageService.create(STORAGE_KEYS.USERS, newStudent);
    
    toast({
      title: "Student Registered",
      description: `${newName} can now access the platform using their ID or Email.`,
    });

    setIsRegisterOpen(false);
    setNewName('');
    setNewEmail('');
    setNewStudentId('');
    loadStudents();
  };

  const handleDeleteStudent = (id: string) => {
    storageService.delete(STORAGE_KEYS.USERS, id);
    toast({
      title: "Record Removed",
      description: "The student account has been deactivated and removed.",
    });
    loadStudents();
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentId.includes(searchTerm) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Student Registry</h1>
          <p className="text-slate-500 font-medium">Manage and enroll USPF students into the GuidanceSync community.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by name, ID, or email..." 
              className="pl-10 h-12 w-[300px] bg-white border-none shadow-sm rounded-2xl text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20 gap-2">
                <UserPlus className="h-5 w-5" /> Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl max-w-md">
              <DialogHeader>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-black">Student Enrollment</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Official GuidanceSync Account</p>
              </DialogHeader>
              <form onSubmit={handleRegisterStudent} className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Full Name</Label>
                  <Input 
                    placeholder="e.g. Maria Clara" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">USPF Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      placeholder="student@uspf.edu.ph" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="h-12 pl-10 rounded-xl bg-slate-50 border-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Student ID</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      placeholder="e.g. 2024-0001" 
                      value={newStudentId}
                      onChange={e => setNewStudentId(e.target.value)}
                      className="h-12 pl-10 rounded-xl bg-slate-50 border-none"
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-black">!</div>
                  <p className="text-[10px] font-bold text-amber-700 leading-relaxed italic">
                    The default password will be set to 'password123'. Students will be prompted to change this upon their first login.
                  </p>
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl bg-primary font-black shadow-lg shadow-primary/20">Register Student Account</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden mb-10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pl-8">Student</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">Student ID</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">University Email</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">Status</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pr-8 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                  <TableCell className="pl-8 py-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                        <AvatarImage src={`https://picsum.photos/seed/${student.id}/64/64`} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{student.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg bg-slate-50 border-none font-black text-[10px] uppercase px-3 py-1">
                      {student.studentId}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-600">{student.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase">Active</Badge>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 group-hover:text-primary">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-slate-100 shadow-xl">
                        <DropdownMenuItem className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-slate-700 hover:bg-slate-50">
                           <ExternalLink className="h-4 w-4 text-slate-400" /> View Wellness Profile
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
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                      <IdCard className="h-10 w-10 opacity-20" />
                      <p className="font-bold text-sm italic">No students found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
