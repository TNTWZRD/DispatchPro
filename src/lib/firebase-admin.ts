
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

try {
  if (!getApps().length) {
    const serviceAccountPath = path.resolve(process.cwd(), 'firebaseAuthKey.key');
    
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountBuffer = fs.readFileSync(serviceAccountPath);
        const serviceAccount = JSON.parse(serviceAccountBuffer.toString());

        adminApp = initializeApp({
          credential: cert(serviceAccount),
        });
        
        console.log("Firebase Admin SDK initialized successfully.");

        adminAuth = getAuth(adminApp);
        adminDb = getFirestore(adminApp);
    } else {
      console.warn("Firebase Admin SDK service account key not found at firebaseAuthKey.key. Server-side auth features will be disabled.");
    }
  } else {
    adminApp = getApps()[0];
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
  }
} catch (error: any) {
    console.error("---------------------------------------------------------------------------------");
    console.error("CRITICAL: Firebase Admin SDK initialization failed.");
    console.error("Error:", error.message);
    console.error("Server-side authentication features will be UNAVAILABLE.");
    console.error("---------------------------------------------------------------------------------");
}

export { adminAuth, adminDb };
