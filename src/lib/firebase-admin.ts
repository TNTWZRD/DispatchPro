// src/lib/firebase-admin.ts

import * as admin from 'firebase-admin';
import type { ServiceAccount } from "firebase-admin";

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialize Firebase Admin SDK for the server
if (!admin.apps.length) {
    try {
        const serviceAccount: ServiceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
        });
    } catch (e: any) {
        console.error('Firebase Admin initialization error:', e.stack);
    }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
