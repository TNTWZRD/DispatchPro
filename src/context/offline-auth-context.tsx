// src/context/offline-auth-context.tsx
// Enhanced authentication context with offline support

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  getAdditionalUserInfo 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { OfflineDataLayer } from '@/lib/offline-data-layer';
import { networkMonitor } from '@/lib/network-monitor';
import { offlineDb } from '@/lib/offline-db';
import type { AppUser, Driver } from '@/lib/types';
import { Role } from '@/lib/types';

// Local storage keys for offline auth
const AUTH_STORAGE_KEY = 'dispatchpro_auth';
const USER_STORAGE_KEY = 'dispatchpro_user';

interface OfflineAuthData {
  uid: string;
  email: string | null;
  lastAuthTime: number;
  tokenExpiry?: number;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseAuthUser | null;
  allUsers: AppUser[];
  loading: boolean;
  isOffline: boolean;
  
  // Auth methods
  signInWithEmailAndPassword: (email: string, password: string) => Promise<any>;
  createUserWithEmailAndPassword: (email: string, password: string, inviteCode?: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  
  // Offline-specific methods
  validateOfflineSession: () => boolean;
  refreshOfflineAuth: () => Promise<void>;
  
  // Role checking
  hasRole: (role: Role) => boolean;
}

const OfflineAuthContext = createContext<AuthContextType | undefined>(undefined);

export const OfflineAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    // Try to restore user from local storage on initialization
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Listen for network status changes
  useEffect(() => {
    const unsubscribe = networkMonitor.addListener(setIsOffline);
    setIsOffline(!networkMonitor.getStatus());
    return unsubscribe;
  }, []);

  // Persist user data to local storage
  const persistUserData = useCallback((userData: AppUser | null) => {
    if (typeof window !== 'undefined') {
      if (userData) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  // Persist auth data for offline validation
  const persistAuthData = useCallback((fbUser: FirebaseAuthUser | null) => {
    if (typeof window !== 'undefined') {
      if (fbUser) {
        const authData: OfflineAuthData = {
          uid: fbUser.uid,
          email: fbUser.email,
          lastAuthTime: Date.now(),
          // Get token expiry if available
          tokenExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours default
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  // Validate offline session
  const validateOfflineSession = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return false;

    try {
      const authData: OfflineAuthData = JSON.parse(stored);
      const now = Date.now();
      
      // Check if session is expired (default 7 days offline)
      const maxOfflineTime = 7 * 24 * 60 * 60 * 1000; // 7 days
      const sessionAge = now - authData.lastAuthTime;
      
      return sessionAge < maxOfflineTime;
    } catch {
      return false;
    }
  }, []);

  // Refresh offline auth data
  const refreshOfflineAuth = useCallback(async (): Promise<void> => {
    if (firebaseUser) {
      persistAuthData(firebaseUser);
    }
  }, [firebaseUser, persistAuthData]);

  // Fetch app user from offline storage or Firestore
  const fetchAppUser = useCallback(async (fbUser: FirebaseAuthUser): Promise<AppUser | null> => {
    try {
      // Try local storage first
      let userData = await OfflineDataLayer.getDocument<AppUser>('users', fbUser.uid);
      
      if (!userData && networkMonitor.getStatus()) {
        // If not found locally and online, try to create from Firebase user data
        userData = {
          uid: fbUser.uid,
          id: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName,
          displayName: fbUser.displayName,
          role: Role.ALL,
          createdAt: new Date(),
        };
        
        // Save to local storage
        await OfflineDataLayer.setDocument('users', fbUser.uid, userData, fbUser.uid);
      }
      
      return userData;
    } catch (error) {
      console.error('Error fetching app user:', error);
      return null;
    }
  }, []);

  // Validate invite code (offline-aware)
  const validateInviteCode = async (code: string) => {
    const invites = await OfflineDataLayer.getCollection('invites', [
      { field: 'code', operator: '==', value: code },
      { field: 'status', operator: '==', value: 'pending' }
    ]);
    
    const validInvite = invites.find(invite => {
      const inviteData = invite as any;
      if (inviteData.expiresAt) {
        return inviteData.expiresAt > new Date();
      }
      return true;
    });
    
    if (!validInvite) {
      throw new Error("Invalid or expired invite code.");
    }
    
    return validInvite;
  };

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('Auth state changed:', fbUser?.uid);
      
      if (fbUser) {
        setFirebaseUser(fbUser);
        persistAuthData(fbUser);
        
        const appUser = await fetchAppUser(fbUser);
        if (appUser) {
          setUser(appUser);
          persistUserData(appUser);
        }
      } else {
        // Check if we have a valid offline session
        if (validateOfflineSession()) {
          console.log('Using offline session');
          // Keep existing user data for offline use
        } else {
          console.log('No valid offline session, logging out');
          setFirebaseUser(null);
          setUser(null);
          persistAuthData(null);
          persistUserData(null);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchAppUser, validateOfflineSession, persistAuthData, persistUserData]);

  // Load all users (offline-aware)
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const users = await OfflineDataLayer.getCollection<AppUser>('users');
        setAllUsers(users);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadAllUsers();
    
    // Set up real-time listener
    const unsubscribe = OfflineDataLayer.onSnapshot<AppUser>('users', undefined, undefined, undefined, undefined, setAllUsers);
    return unsubscribe;
  }, []);

  // Authentication methods
  const signInWithEmailAndPassword = async (email: string, password: string) => {
    if (!networkMonitor.getStatus()) {
      throw new Error('Cannot sign in while offline. Please check your connection and try again.');
    }
    
    const result = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return result;
  };

  const createUserWithEmailAndPassword = async (email: string, pass: string, inviteCode?: string) => {
    if (!networkMonitor.getStatus()) {
      throw new Error('Cannot create account while offline. Please check your connection and try again.');
    }

    let inviteDoc = null;
    if (inviteCode) {
      inviteDoc = await validateInviteCode(inviteCode);
    }

    const result = await firebaseCreateUserWithEmailAndPassword(auth, email, pass);
    const fbUser = result.user;
    
    // Check if a driver with this email already exists
    const drivers = await OfflineDataLayer.getCollection<Driver>('drivers', [
      { field: 'email', operator: '==', value: email }
    ]);

    let role = Role.ALL;
    if (drivers.length > 0) {
      role = Role.DRIVER;
    }
    
    const newAppUser: AppUser = {
      uid: fbUser.uid,
      id: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      name: fbUser.displayName,
      role: role,
      createdAt: new Date(),
    };
    
    await OfflineDataLayer.setDocument('users', fbUser.uid, newAppUser, fbUser.uid);
    setUser(newAppUser);

    // Mark invite as completed if used
    if (inviteDoc) {
      await OfflineDataLayer.updateDocument('invites', inviteDoc.id, {
        status: 'completed',
        usedBy: fbUser.uid
      } as any, fbUser.uid);
    }

    return result;
  };

  const signInWithGoogle = async () => {
    if (!networkMonitor.getStatus()) {
      throw new Error('Cannot sign in with Google while offline. Please check your connection and try again.');
    }
    
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const additionalUserInfo = getAdditionalUserInfo(result);
    
    if (additionalUserInfo?.isNewUser) {
      const fbUser = result.user;
      const newAppUser: AppUser = {
        uid: fbUser.uid,
        id: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        name: fbUser.displayName,
        role: Role.ALL,
        createdAt: new Date(),
      };
      
      await OfflineDataLayer.setDocument('users', fbUser.uid, newAppUser, fbUser.uid);
      setUser(newAppUser);
    }
    
    return result;
  };

  const logout = async () => {
    try {
      if (networkMonitor.getStatus()) {
        await signOut(auth);
      }
      
      // Clear local data
      setUser(null);
      setFirebaseUser(null);
      persistAuthData(null);
      persistUserData(null);
      
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
      // Even if Firebase signout fails, clear local data
      setUser(null);
      setFirebaseUser(null);
      persistAuthData(null);
      persistUserData(null);
      router.push('/login');
    }
  };

  const hasRole = useCallback((role: Role) => {
    if (!user) return false;
    return (user.role & role) > 0;
  }, [user]);

  const contextValue: AuthContextType = {
    user,
    firebaseUser,
    allUsers,
    loading,
    isOffline: !networkMonitor.getStatus(),
    
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithGoogle,
    logout,
    
    validateOfflineSession,
    refreshOfflineAuth,
    
    hasRole
  };

  return (
    <OfflineAuthContext.Provider value={contextValue}>
      {children}
    </OfflineAuthContext.Provider>
  );
};

export const useOfflineAuth = (): AuthContextType => {
  const context = useContext(OfflineAuthContext);
  if (context === undefined) {
    throw new Error('useOfflineAuth must be used within an OfflineAuthProvider');
  }
  return context;
};

// For backward compatibility, export as useAuth
export const useAuth = useOfflineAuth;