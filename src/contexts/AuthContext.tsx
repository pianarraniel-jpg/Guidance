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
  console.log(`[AuthContext] Fetching profile for user: ${userId}`);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, student_id')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data) {
      console.warn(`[AuthContext] Profile fetch failed or not found:`, error?.message || 'No data');
      return null;
    }
    const userObj: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as UserRole,
      studentId: data.student_id ?? undefined,
    };
    // Ensure Supabase session metadata has these fields for instant future reloads
    try {
      await supabase.auth.updateUser({
        data: { name: userObj.name, role: userObj.role, student_id: userObj.studentId }
      });
    } catch {
      // ignore non-critical update errors
    }
    console.log(`[AuthContext] Profile successfully fetched:`, data.email, data.role);
    return userObj;
  } catch (err: any) {
    console.error(`[AuthContext] Unexpected error during fetchProfile:`, err?.message || err);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const router = useRouter();
  const activeUserRef = useRef<string | null>(null);

  const handleSessionUser = async (sessionUser: any, isMounted: boolean) => {
    const meta = sessionUser.user_metadata || {};
    
    // If Supabase session metadata already has name and role, hydrate instantly without a database round-trip
    if (meta.name && meta.role) {
      console.log(`[AuthContext] Instantly hydrated from Supabase session metadata:`, sessionUser.email, meta.role);
      const userObj: User = {
        id: sessionUser.id,
        name: meta.name,
        email: sessionUser.email || meta.email || '',
        role: meta.role as UserRole,
        studentId: meta.student_id ?? undefined,
      };
      activeUserRef.current = sessionUser.id;
      if (isMounted) {
        setUser(userObj);
        setIsLoading(false);
      }
      return;
    }

    // Fallback: fetch profile from database once if metadata is missing
    if (activeUserRef.current !== sessionUser.id) {
      activeUserRef.current = sessionUser.id;
      const profile = await fetchProfile(sessionUser.id);
      if (isMounted && profile) {
        setUser(profile);
        setIsLoading(false);
      } else if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    console.log(`[AuthContext] Initializing Supabase auth check on mount...`);
    let isMounted = true;

    // Fail-safe timeout
    const timer = setTimeout(() => {
      if (isMounted) {
        console.warn(`[AuthContext] Supabase auth timed out after 5s. Forcing isLoading = false.`);
        setIsLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error || !session?.user) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }
      handleSessionUser(session.user, isMounted);
    }).catch(err => {
      console.error(`[AuthContext] Unhandled rejection in getSession:`, err);
      if (isMounted) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] onAuthStateChange:`, event, !!session);
      if (!isMounted) return;
      if (session?.user) {
        handleSessionUser(session.user, isMounted);
      } else {
        activeUserRef.current = null;
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return false;
      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setUser(profile);
        return true;
      }
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
      if (apiProfile) {
        try {
          await supabase.auth.updateUser({
            data: { name: apiProfile.name, role: apiProfile.role, student_id: apiProfile.studentId }
          });
        } catch {}
        setUser(apiProfile);
        return true;
      }
      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setUser(profile);
        return true;
      }
      return false;
    } catch {
      return false;
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
