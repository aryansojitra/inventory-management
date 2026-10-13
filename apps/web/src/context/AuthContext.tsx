import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService, LoginPayload } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCoordinator: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  quickLogin: (role: 'coordinator' | 'student' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dims_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dims_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('dims_token');
      if (storedToken) {
        try {
          const currentUser = await authService.getMe();
          setUser(currentUser);
          localStorage.setItem('dims_user', JSON.stringify(currentUser));
        } catch {
          localStorage.removeItem('dims_token');
          localStorage.removeItem('dims_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const { token: newToken, user: newUser } = await authService.login(payload);
      localStorage.setItem('dims_token', newToken);
      localStorage.setItem('dims_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: 'coordinator' | 'student' | 'admin') => {
    const emails: Record<string, string> = {
      coordinator: 'coordinator@department.edu',
      student: 'student1@department.edu',
      admin: 'admin@department.edu',
    };
    await login({ email: emails[role] || `${role}@department.edu`, role });
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const isCoordinator = user?.role === 'coordinator' || user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isCoordinator,
        isStudent,
        isAdmin,
        login,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
