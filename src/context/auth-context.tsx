
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, query, where, Timestamp, getDocs, updateDoc } from 'firebase/firestore';
import type { AppUser, Driver } from '@/lib/types';
import { Role } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseAuthUser | null;
  allUsers: AppUser[];
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithGoogle: (inviteCode: string) => Promise<void>;
  signInWithEmailAndPassword: (email: string, pass: string) => Promise<void>;
  createUserWithEmailAndPassword: (email: string, pass: string, inviteCode: string) => Promise<any>;
  logout: () => Promise<void>;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const validateInviteCode = async (code: string) => {
    const invitesQuery = query(
      collection(db, 'invites'),
      where('code', '==', code),
      where('status', '==', 'pending'),
      where('expiresAt', '>', Timestamp.now())
    );
    const inviteSnapshot = await getDocs(invitesQuery);
    if (inviteSnapshot.empty) {
      throw new Error("Invalid or expired invite code.");
    }
    return inviteSnapshot.docs[0];
  };

  const fetchAppUser = useCallback(async (fbUser: FirebaseAuthUser): Promise<AppUser | null> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      const appUser = {
          ...data,
          id: userDoc.id,
          uid: userDoc.id,
          name: data.displayName,
          displayName: data.displayName
      } as AppUser;

      if (appUser.role & Role.DRIVER) {
        const driverDocRef = doc(db, 'drivers', fbUser.uid);
        const driverDoc = await getDoc(driverDocRef);
        if (!driverDoc.exists()) {
          const newDriver: Omit<Driver, 'id'> = {
            name: appUser.displayName || appUser.email || 'Unnamed Driver',
            phoneNumber: appUser.phoneNumber || '',
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const appUser = await fetchAppUser(fbUser);
        setUser(appUser);
        
        // Centralized redirection logic
        if (appUser && (pathname === '/login' || pathname === '/register')) {
            const roleParam = searchParams.get('role');
            if (roleParam === 'driver' && (appUser.role & Role.DRIVER)) {
                router.push('/driver');
            } else if (appUser.role & Role.DISPATCHER || appUser.role & Role.ADMIN || appUser.role & Role.OWNER) {
                router.push('/');
            } else if (appUser.role & Role.DRIVER) { // Fallback for driver if no role param
                router.push('/driver');
            }
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            uid: doc.id,
            ...doc.data()
        } as AppUser));
        setAllUsers(usersData);
    });

    return () => {
        unsubscribeAuth();
        unsubscribeUsers();
    };
  }, [fetchAppUser, pathname, router, searchParams]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const appUser = await fetchAppUser(result.user);

      if (!appUser) {
          // This case is for when a user signs in with Google but isn't in our DB.
          // We sign them out and throw an error to be caught by the form.
          await signOut(auth);
          const error = new Error("Account not found. Please register first.") as any;
          error.code = "auth/user-not-found";
          throw error;
      }
      // Redirection is handled by the onAuthStateChanged effect
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };
  
  const registerWithGoogle = async (inviteCode: string) => {
    const inviteDoc = await validateInviteCode(inviteCode);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
       const fbUser = result.user;
       const additionalInfo = getAdditionalUserInfo(result);

       if (additionalInfo?.isNewUser) {
         // Check if a driver with this email already exists
         const driverQuery = query(collection(db, 'drivers'), where('email', '==', fbUser.email));
         const driverSnapshot = await getDocs(driverQuery);

         let role = Role.DISPATCHER; // Default role
         if (!driverSnapshot.empty) {
             role = Role.DRIVER; // Assign driver role if email matches
         }

         const newAppUser: AppUser = {
           uid: fbUser.uid,
           id: fbUser.uid,
           email: fbUser.email,
           displayName: fbUser.displayName,
           name: fbUser.displayName,
           role: role, 
           photoURL: fbUser.photoURL,
         };
         await setDoc(doc(db, "users", fbUser.uid), {
             ...newAppUser,
             createdAt: serverTimestamp()
         });
         setUser(newAppUser);
         
         // Mark invite as completed
         await updateDoc(inviteDoc.ref, { status: 'completed', usedBy: fbUser.uid });
       }
      // Redirection is handled by the onAuthStateChanged effect
    } catch (error) {
      console.error("Error registering with Google", error);
      throw error;
    }
  };
  
  const signInWithEmailAndPassword = async (email: string, pass: string) => {
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, pass);
      // Redirection is handled by the onAuthStateChanged effect
    } catch (error) {
       console.error("Error signing in with email and password", error);
       throw error;
    }
  };
  
  const createUserWithEmailAndPassword = async (email: string, pass: string, inviteCode: string) => {
    const inviteDoc = await validateInviteCode(inviteCode);
    
    const result = await firebaseCreateUserWithEmailAndPassword(auth, email, pass);
    const fbUser = result.user;
    
    // Check if a driver with this email already exists
    const driverQuery = query(collection(db, 'drivers'), where('email', '==', email));
    const driverSnapshot = await getDocs(driverQuery);

    let role = Role.DISPATCHER; // Default role
    if (!driverSnapshot.empty) {
        role = Role.DRIVER; // Assign driver role if email matches
    }
    
    const newAppUser: AppUser = {
        uid: fbUser.uid,
        id: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName, 
        name: fbUser.displayName,
        role: role, 
    };
    await setDoc(doc(db, 'users', fbUser.uid), {
        ...newAppUser,
        createdAt: serverTimestamp(),
    });
    setUser(newAppUser);

    // Mark invite as completed
    await updateDoc(inviteDoc.ref, { status: 'completed', usedBy: fbUser.uid });

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
    <AuthContext.Provider value={{ user, firebaseUser, allUsers, loading, signInWithGoogle, registerWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword, logout, hasRole }}>
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
