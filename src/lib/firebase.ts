
// src/lib/firebase.ts

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

let messaging: Messaging | null = null;
if (typeof window !== "undefined") {
    messaging = getMessaging(app);
}

export const getFCMToken = async () => {
    if (!messaging) return null;
    try {
        const status = await Notification.requestPermission();
        if (status === 'granted') {
            const fcmToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY });
            if (fcmToken) {
                return fcmToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        }
    } catch(error) {
        console.error('An error occurred while retrieving token. ', error);
        return null;
    }
    return null;
}

if (messaging) {
    onMessage(messaging, (payload) => {
        console.log('Foreground message received. ', payload);
        new Notification(payload.notification?.title || 'New Notification', {
            body: payload.notification?.body,
            icon: payload.notification?.icon,
        });
    });
}

export { app, auth, db, messaging };
