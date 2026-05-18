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
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, student_id')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      if (error?.message?.includes('JWT') || error?.message?.includes('token') || error?.code === 'PGRST301') {
        // Corrupted or expired auth token detected: force clean session reset
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') localStorage.clear();
      }
      return null;
    }
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as UserRole,
      studentId: data.student_id ?? undefined,
    };
  } catch (err) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (isMounted) {
          setUser(profile);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (isMounted && profile) {
          setUser(profile);
        }
      } else {
        if (isMounted) setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return false;
      const profile = await fetchProfile(data.user.id);
      if (profile) { setUser(profile); return true; }
      return false;
    } catch {
      return false;
    }
  };

  const loginWithId = async (studentId: string): Promise<boolean> => {
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
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') localStorage.clear();
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
