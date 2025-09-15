
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'firebaseAuthKey.key');

  try {
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error("Service account key file `firebaseAuthKey.key` not found in project root.");
    }
    
    const serviceAccountBuffer = fs.readFileSync(serviceAccountPath);
    const serviceAccount = JSON.parse(serviceAccountBuffer.toString());

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
    
    console.log("Firebase Admin SDK initialized successfully.");

  } catch (error: any) {
    console.error("---------------------------------------------------------------------------------");
    console.error("CRITICAL: Firebase Admin SDK initialization failed.");
    if (error.message.includes("not found")) {
        console.error(error.message);
    } else {
      console.error("Error: Failed to parse or use the service account key. The file may be malformed or empty.");
      console.error("Underlying error:", error.message);
    }
    console.error("Server-side authentication features will be UNAVAILABLE.");
    console.error("---------------------------------------------------------------------------------");
  }
}

// @ts-ignore
adminAuth = getAuth(adminApp);
// @ts-ignore
adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
