"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserRole, USER_ROLES } from '@/lib/constants';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithId: (studentId: string) => Promise<boolean>;
  logout: () => void;
  isStudent: boolean;
  isCounselor: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, student_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    studentId: data.student_id ?? undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const loginInProgress = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (loginInProgress.current) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    loginInProgress.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return false;
      const profile = await fetchProfile(data.user.id);
      if (profile) { setUser(profile); return true; }
      return false;
    } finally {
      loginInProgress.current = false;
    }
  };

  const loginWithId = async (studentId: string): Promise<boolean> => {
    loginInProgress.current = true;
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      if (!res.ok) return false;
      const { accessToken, refreshToken, profile: apiProfile } = await res.json();
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error || !data.user) return false;
      if (apiProfile) { setUser(apiProfile); return true; }
      const profile = await fetchProfile(data.user.id);
      if (profile) { setUser(profile); return true; }
      return false;
    } catch {
      return false;
    } finally {
      loginInProgress.current = false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithId,
    logout,
    isStudent: user?.role === USER_ROLES.STUDENT,
    isCounselor: user?.role === USER_ROLES.COUNSELOR,
    isAdmin: user?.role === USER_ROLES.ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
