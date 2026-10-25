import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/lessonPlan';
import { 
  signIn as apiSignIn, 
  signUp as apiSignUp, 
  signOut as apiSignOut, 
  subscribeToAuth, 
  getUserProfile,
  sendPasswordReset as apiSendPasswordReset,
  signInWithGoogle as apiSignInWithGoogle
} from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, name: string, school?: string) => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((profile) => {
      setUser(profile);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    const result = await apiSignIn(email, pass);
    if (result.success && result.user) {
      setUser(result.user);
    }
    setIsLoading(false);
    return result;
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    const result = await apiSignInWithGoogle();
    if (result.success && result.user) {
      setUser(result.user);
    }
    setIsLoading(false);
    return result;
  };

  const signUp = async (email: string, pass: string, name: string, school?: string) => {
    setIsLoading(true);
    const result = await apiSignUp(email, pass, name, school);
    if (result.success && result.user) {
      setUser(result.user);
    }
    setIsLoading(false);
    return result;
  };

  const signOutUser = async () => {
    setIsLoading(true);
    await apiSignOut();
    setUser(null);
    setIsLoading(false);
  };

  const sendResetEmail = async (email: string) => {
    return await apiSendPasswordReset(email);
  };

  const refreshProfile = async () => {
    if (user?.uid) {
      const refreshed = await getUserProfile(user.uid);
      if (refreshed) {
        setUser(refreshed);
      }
    }
  };

  const isAdmin = Boolean(
    user && 
    (user.role === 'admin' || user.email?.toLowerCase() === 'twizerefelix90@gmail.com') && 
    user.status === 'active'
  );
  const isTeacher = Boolean(user && (user.role === 'teacher' || user.role === 'admin' || user.email?.toLowerCase() === 'twizerefelix90@gmail.com') && user.status === 'active');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isTeacher,
        isLoading,
        signIn,
        signInWithGoogle,
        signUp,
        signOutUser,
        sendResetEmail,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
