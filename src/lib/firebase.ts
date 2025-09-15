// src/lib/firebase.ts

import { initializeApp, getApps, getApp, type FirebaseApp, cert, ServiceAccount } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import * as admin from 'firebase-admin';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};


// Initialize Firebase for the client
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);


// Initialize Firebase Admin SDK for the server
if (process.env.NODE_ENV !== 'development' || !admin.apps.length) {
    try {
        const serviceAccount: ServiceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
        });
    } catch(e) {
        if (process.env.NODE_ENV !== 'development') {
            console.error('Firebase Admin initialization error:', e);
        }
    }
}

const adminAuth = admin.apps.length ? admin.auth() : null;

export { app, auth, db, adminAuth };
