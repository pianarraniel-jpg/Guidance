"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  COLLEGES_AND_PROGRAMS,
  YEAR_LEVELS,
  getProgramsForCollege,
} from '@/lib/constants';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Calendar,
  IdCard,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface AcademicClassificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isMandatory?: boolean;
}

export default function AcademicClassificationModal({
  open,
  onOpenChange,
  onSuccess,
  isMandatory = false,
}: AcademicClassificationModalProps) {
  const { user, updateUserAcademic } = useAuth();
  const { toast } = useToast();

  const [department, setDepartment] = useState(user?.department || '');
  const [program, setProgram] = useState(user?.program || '');
  const [yearLevel, setYearLevel] = useState(user?.yearLevel || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Sync internal state when user changes or modal opens
  useEffect(() => {
    if (open && user) {
      setDepartment(user.department || '');
      setProgram(user.program || '');
      setYearLevel(user.yearLevel || '');
      setStudentId(user.studentId || '');
      setValidationError('');
    }
  }, [open, user]);

  const availablePrograms = getProgramsForCollege(department);

  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    // Reset program if it doesn't belong to the new department
    const progs = getProgramsForCollege(newDept);
    if (!progs.includes(program)) {
      setProgram('');
    }
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!department) {
      setValidationError('Please select your College / Department.');
      return;
    }
    if (!program) {
      setValidationError('Please select your Degree Program.');
      return;
    }
    if (!yearLevel) {
      setValidationError('Please select your Year Level.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateUserAcademic({
        department: department.trim(),
        program: program.trim(),
        yearLevel: yearLevel.trim(),
        studentId: studentId.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update academic profile.');
      }

      toast({
        title: "Academic Classification Saved",
        description: "Your academic profile is complete. You can now book appointments with your designated counselor.",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setValidationError(err.message || 'An error occurred while saving.');
      toast({
        variant: "destructive",
        title: "Failed to save classification",
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing by backdrop or escape if mandatory and incomplete
        if (!newOpen && isMandatory && (!user?.department || !user?.program || !user?.yearLevel)) {
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden border-slate-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight">
                  Academic Classification
                </DialogTitle>
                <DialogDescription className="text-xs text-white/90 font-medium mt-0.5">
                  Set your college details to connect with your designated counselor
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Context Notice */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5 text-amber-950">Why is this required?</span>
                Guidance counselors at USPF are specialized by college department. Specifying your academic classification ensures your consultation requests and wellness records are routed to the counselor dedicated to your college.
              </div>
            </div>

            {validationError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                {validationError}
              </div>
            )}

            {/* Department / College */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                College / Department <span className="text-red-500">*</span>
              </Label>
              <Select value={department} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="w-full text-xs h-10 border-slate-200">
                  <SelectValue placeholder="Select your college department" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COLLEGES_AND_PROGRAMS.map((col) => (
                    <SelectItem key={col.code} value={col.code} className="text-xs">
                      <span className="font-semibold text-slate-900">{col.code}</span>
                      <span className="text-slate-500 ml-1.5">— {col.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Degree Program */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                Degree Program / Course <span className="text-red-500">*</span>
              </Label>
              <Select
                value={program}
                onValueChange={(val) => {
                  setProgram(val);
                  setValidationError('');
                }}
                disabled={!department}
              >
                <SelectTrigger className="w-full text-xs h-10 border-slate-200">
                  <SelectValue placeholder={department ? "Select your degree program" : "First select a college above"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availablePrograms.map((prog) => (
                    <SelectItem key={prog} value={prog} className="text-xs">
                      {prog}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Level */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Year Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={yearLevel}
                onValueChange={(val) => {
                  setYearLevel(val);
                  setValidationError('');
                }}
              >
                <SelectTrigger className="w-full text-xs h-10 border-slate-200">
                  <SelectValue placeholder="Select your current year level" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_LEVELS.map((yr) => (
                    <SelectItem key={yr} value={yr} className="text-xs">
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student ID (Optional / Editable) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-slate-400" />
                University Student ID Number
              </Label>
              <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 2024-12345 or 12345678"
                className="text-xs h-10 border-slate-200"
              />
              <p className="text-[11px] text-slate-400">
                Printed on your USPF ID card or registration form.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 flex items-center justify-between">
            {!isMandatory ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs text-slate-600"
              >
                Skip for Now
              </Button>
            ) : (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Classification required to continue
              </div>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Save Academic Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
