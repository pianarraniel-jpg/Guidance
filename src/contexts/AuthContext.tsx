"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserRole, USER_ROLES } from '@/lib/constants';
import { updateAcademicClassification } from '@/lib/profile-utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
  department?: string;
  program?: string;
  yearLevel?: string;
}

export interface LoginResult {
  success: boolean;
  role?: UserRole;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithId: (studentId: string) => Promise<LoginResult>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserAcademic: (academicData: {
    department: string;
    program: string;
    yearLevel: string;
    studentId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  isStudent: boolean;
  isCounselor: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<User | null> {
  console.log(`[AuthContext] Fetching profile for user: ${userId}`);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const meta = sessionData?.session?.user?.user_metadata || {};

    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!data && sessionData?.session?.user) {
      const sUser = sessionData.session.user;
      const defaultName = meta.full_name || meta.name || sUser.email?.split('@')[0] || 'Student';
      const defaultRole = meta.role || 'student';
      const { data: created } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: defaultName,
          email: sUser.email || '',
          role: defaultRole,
        })
        .select()
        .maybeSingle();

      if (created) {
        data = created;
      }
    }

    if (!data) {
      console.warn(`[AuthContext] Profile fetch failed or not found:`, error?.message || 'No data');
      return null;
    }

    const userObj: User = {
      id: data.id,
      name: data.name || meta.full_name || meta.name || '',
      email: data.email || meta.email || '',
      role: (data.role || meta.role || 'student') as UserRole,
      studentId: data.student_id || meta.student_id || undefined,
      department: data.department || meta.department || undefined,
      program: data.program || data.course || meta.program || undefined,
      yearLevel: data.year_level || data.year || meta.year_level || undefined,
    };

    // Ensure Supabase session metadata has these fields for instant future reloads
    try {
      await supabase.auth.updateUser({
        data: {
          name: userObj.name,
          role: userObj.role,
          student_id: userObj.studentId,
          department: userObj.department,
          program: userObj.program,
          year_level: userObj.yearLevel,
        }
      });
    } catch {
      // ignore non-critical update errors
    }
    console.log(`[AuthContext] Profile successfully fetched:`, data.email, userObj.role);
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
    
    // Quick hydrate if full metadata is ready
    if (meta.name && meta.role && meta.department && meta.program && meta.year_level) {
      const userObj: User = {
        id: sessionUser.id,
        name: meta.name || meta.full_name || '',
        email: sessionUser.email || meta.email || '',
        role: meta.role as UserRole,
        studentId: meta.student_id ?? undefined,
        department: meta.department ?? undefined,
        program: meta.program ?? undefined,
        yearLevel: meta.year_level ?? undefined,
      };
      activeUserRef.current = sessionUser.id;
      if (isMounted) {
        setUser(userObj);
        setIsLoading(false);
      }
      return;
    }

    // Comprehensive fetch: fetch profile from database
    if (activeUserRef.current !== sessionUser.id) {
      activeUserRef.current = sessionUser.id;
      const profile = await fetchProfile(sessionUser.id);
      if (isMounted) {
        if (profile) {
          setUser(profile);
        } else if (meta.name || meta.full_name) {
          setUser({
            id: sessionUser.id,
            name: meta.name || meta.full_name || 'Student',
            email: sessionUser.email || '',
            role: (meta.role as UserRole) || 'student',
            studentId: meta.student_id ?? undefined,
            department: meta.department ?? undefined,
            program: meta.program ?? undefined,
            yearLevel: meta.year_level ?? undefined,
          });
        }
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

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error || !data.user) {
        console.error('[AuthContext] signInWithPassword failed:', error?.message);
        return {
          success: false,
          error: error?.message || 'Invalid email or password. Please try again.',
        };
      }

      let profile = await fetchProfile(data.user.id);
      if (!profile && data.user) {
        const meta = data.user.user_metadata || {};
        profile = {
          id: data.user.id,
          name: meta.name || cleanEmail.split('@')[0] || 'User',
          email: data.user.email || cleanEmail,
          role: (meta.role as UserRole) || USER_ROLES.STUDENT,
          studentId: meta.student_id ?? undefined,
          department: meta.department ?? undefined,
          program: meta.program ?? undefined,
          yearLevel: meta.year_level ?? undefined,
        };

        // Self-heal: ensure missing profile row is added to profiles table
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            student_id: profile.studentId,
            department: profile.department,
          });
        } catch (e) {
          console.warn('[AuthContext] Auto-heal profile failed:', e);
        }
      }

      if (profile) {
        setUser(profile);
        return { success: true, role: profile.role };
      }
      return { success: false, error: 'Could not load your user profile.' };
    } catch (err: any) {
      console.error('[AuthContext] Unexpected login exception:', err?.message || err);
      return { success: false, error: err?.message || 'An unexpected error occurred.' };
    }
  };

  const loginWithId = async (studentId: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: resData?.error || 'Student ID not recognized. Please check your ID number.',
        };
      }
      const { accessToken, refreshToken, profile: apiProfile } = resData;
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error || !data.user) {
        return { success: false, error: 'Session could not be established.' };
      }
      if (apiProfile) {
        try {
          await supabase.auth.updateUser({
            data: { name: apiProfile.name, role: apiProfile.role, student_id: apiProfile.studentId }
          });
        } catch {}
        setUser(apiProfile);
        return { success: true, role: apiProfile.role };
      }
      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setUser(profile);
        return { success: true, role: profile.role };
      }
      return { success: false, error: 'Student profile not found.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unable to sign in with Student ID.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim();
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to dispatch password reset request.' };
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            hd: 'uspf.edu.ph',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.url) {
        // Pre-flight check: verify if Google provider is enabled in Supabase without kicking user to a raw JSON error page
        try {
          const probe = await fetch(data.url, { method: 'GET' });
          if (probe.status === 400) {
            const errJson = await probe.json().catch(() => null);
            if (errJson?.msg?.includes('not enabled') || errJson?.error_code === 'validation_failed') {
              return {
                success: false,
                error: 'Google Workspace Sign-In is not enabled in the Supabase project dashboard. Please sign in with your email or Student ID.',
              };
            }
          }
        } catch {
          // If probe fails (e.g. network edge cases), fall through to standard redirect
        }

        window.location.href = data.url;
        return { success: true };
      }

      return { success: false, error: 'Could not generate Google login URL.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google SSO initialization failed.' };
    }
  };

  const updateUserAcademic = async (academicData: {
    department: string;
    program: string;
    yearLevel: string;
    studentId?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User is not authenticated.' };

    const res = await updateAcademicClassification(user.id, academicData);
    if (res.success) {
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          department: academicData.department,
          program: academicData.program,
          yearLevel: academicData.yearLevel,
          ...(academicData.studentId ? { studentId: academicData.studentId } : {}),
        };
      });
    }
    return res;
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
    resetPassword,
    signInWithGoogle,
    logout,
    updateUserAcademic,
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
