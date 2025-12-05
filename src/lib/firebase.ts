import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Firebase config from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required config keys
const requiredConfig = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missing = requiredConfig.filter(
  (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
);

if (missing.length > 0) {
  throw new Error(
    `Missing Firebase config values: ${missing.join(", ")}. ` +
      `Check your .env file for VITE_FIREBASE_* variables.`
  );
}

// Initialize the Firebase app safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services (production only — no emulators)
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");

// Help debug issues if needed (remove in production)
console.log("Firebase initialized with project:", firebaseConfig.projectId);

export const isFirebaseInitialized = true;
