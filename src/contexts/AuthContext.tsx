"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, UserRole, USER_ROLES } from '@/lib/constants';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    storageService.init();
    const storedUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = storageService.getAll<any>(STORAGE_KEYS.USERS);
    const foundUser = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (foundUser) {
      const userToStore = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        studentId: foundUser.studentId,
      };
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userToStore));
      setUser(userToStore);
      return true;
    }
    return false;
  };

  const loginWithId = async (studentId: string): Promise<boolean> => {
    const users = storageService.getAll<any>(STORAGE_KEYS.USERS);
    // Robust search: trim whitespace and ignore case
    const searchId = studentId.trim();
    const foundUser = users.find(u => u.studentId === searchId);

    if (foundUser) {
      const userToStore = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        studentId: foundUser.studentId,
      };
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userToStore));
      setUser(userToStore);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    setUser(null);
    router.push('/login');
  };

  const value = {
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
