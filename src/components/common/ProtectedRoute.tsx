"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(`[ProtectedRoute] User not authenticated. Redirecting to /login.`);
      router.push('/login');
    } else if (!isLoading && isAuthenticated && allowedRoles && !allowedRoles.includes(user!.role)) {
      console.log(`[ProtectedRoute] Role mismatch for role ${user!.role}. Redirecting to /${user!.role}/dashboard.`);
      router.push(`/${user!.role}/dashboard`);
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading) {
    console.log(`[ProtectedRoute] Auth is currently loading. Rendering spinner...`);
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || (allowedRoles && !allowedRoles.includes(user!.role))) {
    console.log(`[ProtectedRoute] Access denied or redirecting. Rendering null.`);
    return null;
  }

  console.log(`[ProtectedRoute] Access granted for role ${user!.role}. Rendering protected content.`);
  return <>{children}</>;
};


export default ProtectedRoute;
