"use client";

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

export default function AuthDebugger() {
  const { user, firebaseUser, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkAuthState = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        loading,
        firebaseUser: firebaseUser ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
        } : null,
        appUser: user,
        authCurrentUser: auth.currentUser ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
        } : null
      };

      // Test Firestore access
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          info.firestoreAccess = {
            documentExists: userDoc.exists(),
            data: userDoc.exists() ? userDoc.data() : null
          };
        } catch (error: any) {
          info.firestoreError = {
            code: error.code,
            message: error.message
          };
        }
      }

      setDebugInfo(info);
    };

    checkAuthState();
  }, [user, firebaseUser, loading]);

  // Only show in development AND when explicitly enabled
  // To enable: add ?debug=auth to the URL or set localStorage.authDebug = 'true'
  const isEnabled = process.env.NODE_ENV === 'development' && (
    typeof window !== 'undefined' && (
      window.location.search.includes('debug=auth') ||
      localStorage.getItem('authDebug') === 'true'
    )
  );

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 p-4 bg-black text-white text-xs max-w-md max-h-96 overflow-auto z-50 opacity-80">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}