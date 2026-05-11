"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        router.push(`/${user.role}/dashboard`);
      } else {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-pulse font-headline text-2xl text-primary font-bold">GuidanceSync</div>
    </div>
  );
}
