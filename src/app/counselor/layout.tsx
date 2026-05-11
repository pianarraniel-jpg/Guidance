"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import CounselorDashboardLayout from '@/components/layout/CounselorDashboardLayout';

interface CounselorLayoutProps {
  children: React.ReactNode;
}

export default function CounselorLayout({ children }: CounselorLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['counselor']}>
      <CounselorDashboardLayout>
        {children}
      </CounselorDashboardLayout>
    </ProtectedRoute>
  );
}
