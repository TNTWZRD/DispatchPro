
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { AppUser, Driver } from '@/lib/types';
import { Role } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseAuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailAndPassword: (email: string, pass: string) => Promise<void>;
  createUserWithEmailAndPassword: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchAppUser = useCallback(async (fbUser: FirebaseAuthUser): Promise<AppUser | null> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const appUser = userDoc.data() as AppUser;

      if (appUser.role & Role.DRIVER) {
        const driverDocRef = doc(db, 'drivers', fbUser.uid);
        const driverDoc = await getDoc(driverDocRef);
        if (!driverDoc.exists()) {
          const newDriver: Omit<Driver, 'id'> = {
            name: appUser.displayName || appUser.email || 'Unnamed Driver',
            phoneNumber: '',
            rating: 5,
            status: 'offline',
            location: { x: 50, y: 50 },
          };
          await setDoc(driverDocRef, newDriver);
        }
      }
      return appUser;
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const appUser = await fetchAppUser(fbUser);
        setUser(appUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAppUser]);


  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const additionalInfo = getAdditionalUserInfo(result);

      // Check if user is new and create a document if so
      if (additionalInfo?.isNewUser) {
        const newAppUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          role: Role.DISPATCHER, // Default role
          photoURL: fbUser.photoURL,
        };
        await setDoc(doc(db, "users", fbUser.uid), {
          ...newAppUser,
          createdAt: serverTimestamp()
        });
        setUser(newAppUser); // Set user in context immediately
      }
      // For existing users, the onAuthStateChanged listener will handle setting the user state.
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };
  
  const signInWithEmailAndPassword = async (email: string, pass: string) => {
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, pass);
      // Let onAuthStateChanged handle the rest
    } catch (error) {
       console.error("Error signing in with email and password", error);
       throw error;
    }
  };
  
  const createUserWithEmailAndPassword = async (email: string, pass: string) => {
    const result = await firebaseCreateUserWithEmailAndPassword(auth, email, pass);
    const fbUser = result.user;
    const newAppUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName, 
        role: Role.DISPATCHER, 
    };
    await setDoc(doc(db, 'users', fbUser.uid), {
        ...newAppUser,
        createdAt: serverTimestamp(),
    });
    setUser(newAppUser);
    return result;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };
  
  const hasRole = useCallback((role: Role) => {
    if (!user) return false;
    return (user.role & role) > 0;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword, logout, hasRole }}>
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
