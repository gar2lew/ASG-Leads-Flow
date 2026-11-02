"use client";

import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import { Firestore, connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

function validateConfig(): Record<string, string> {
  const missing: Record<string, string> = {};
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (!value) {
      missing[key] = value;
    }
  }
  return missing;
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let configValidated = false;

function getApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase client can only be initialized in the browser.");
  }
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0] as FirebaseApp;
    } else {
      const missing = validateConfig();
      if (Object.keys(missing).length > 0 && configValidated === false) {
        configValidated = true;
        console.warn(
          "[firebase] Missing client configuration keys:",
          Object.keys(missing)
        );
      }
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
}

const useEmulator =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  typeof window !== "undefined";

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getApp());
    if (useEmulator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true } as any);
    }
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getApp());
    if (useEmulator) {
      connectFirestoreEmulator(
        db,
        "localhost",
        Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT) || 8080
      );
    }
  }
  return db;
}

export { getApp as getFirebaseApp };

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.authDomain
  );
};
