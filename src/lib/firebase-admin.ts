
// src/lib/firebase-admin.ts

import * as admin from 'firebase-admin';
import type { ServiceAccount } from "firebase-admin";

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;

// Initialize Firebase Admin SDK for the server
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount: ServiceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY
            );

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
            });

            adminAuth = admin.auth();
            adminDb = admin.firestore();

        } catch (e: any) {
            console.error('Firebase Admin initialization error: Failed to parse service account key.', e.stack);
        }
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Firebase Admin SDK could not be initialized. Server-side auth features will not be available.");
    }
} else {
    adminAuth = admin.auth();
    adminDb = admin.firestore();
}

export { adminAuth, adminDb };
