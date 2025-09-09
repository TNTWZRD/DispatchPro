
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, getAdditionalUserInfo, deleteUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithGoogle: () => Promise<void>;
  signInWithEmailAndPassword: (email: string, pass: string) => Promise<void>;
  createUserWithEmailAndPassword: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (additionalUserInfo?.isNewUser) {
        // If the user is new, they haven't been invited.
        // Delete the user and throw an error.
        const userToDelete = result.user;
        await signOut(auth); // Sign out first
        if (userToDelete) {
          await deleteUser(userToDelete);
        }
        const error = new Error("Account not found. Please register first.") as any;
        error.code = "auth/user-not-found";
        throw error;
      }
      
      const role = searchParams.get('role');
      router.push(role === 'driver' ? '/driver' : '/');

    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };
  
  const registerWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Let onAuthStateChanged handle the redirect
      router.push('/');
    } catch (error) {
      console.error("Error registering with Google", error);
      throw error;
    }
  };
  
  const signInWithEmailAndPassword = async (email: string, pass: string) => {
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
       console.error("Error signing in with email and password", error);
       throw error;
    }
  };
  
  const createUserWithEmailAndPassword = async (email: string, pass: string) => {
    try {
      await firebaseCreateUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
       console.error("Error creating user with email and password", error);
       throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, registerWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
