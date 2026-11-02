import "server-only";

import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function normalizePrivateKey(key: string | undefined): string {
  if (!key) return "";
  // Handle escaped newlines from environment variables
  return key.replace(/\\n/g, "\n");
}

function validateAdminConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) missing.push("FIREBASE_ADMIN_PROJECT_ID");
  if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY) missing.push("FIREBASE_ADMIN_PRIVATE_KEY");
  return { isValid: missing.length === 0, missing };
}

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

const useEmulator = process.env.FIREBASE_USE_EMULATOR === "true";

function getAdminApp(): App {
  if (!app) {
    if (useEmulator) {
      // Emulator mode: no service-account credential required. The Admin SDK
      // routes Auth traffic to FIREBASE_AUTH_EMULATOR_HOST and Firestore
      // traffic to FIRESTORE_EMULATOR_HOST (set in .env.local).
      if (getApps().length > 0) {
        app = getApps()[0];
      } else {
        app = initializeApp({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "asg-leads-dev",
        });
      }
    } else {
      const { isValid, missing } = validateAdminConfig();
      if (!isValid) {
        throw new Error(
          `[firebase-admin] Missing required environment variables: ${missing.join(", ")}`
        );
      }

      if (getApps().length > 0) {
        app = getApps()[0];
      } else {
        app = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
          }),
        });
      }
    }
  }
  return app;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}

export const isAdminConfigured = (): boolean => {
  if (useEmulator) return true;
  const { isValid } = validateAdminConfig();
  return isValid;
};
