// ============================================
// ASG Leads — User Profile Service (Server)
// ============================================

import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { UserProfile, AuthRole, OfficeId } from "@/lib/auth/types";

const USERS_COLLECTION = COLLECTIONS.USERS;

export interface CreateUserProfileInput {
  uid: string;
  email: string;
  displayName: string;
  role: AuthRole;
  officeIds: OfficeId[];
  primaryOfficeId?: OfficeId | null;
  phone?: string | null;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getAdminFirestore();
  const docRef = db.collection(USERS_COLLECTION).doc(uid);
  const doc = await docRef.get();
  
  if (!doc.exists) return null;
  
  return { uid, ...doc.data() } as UserProfile;
}

export async function createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();
  
  const profile: UserProfile = {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    officeIds: input.officeIds,
    primaryOfficeId: input.primaryOfficeId ?? input.officeIds[0] ?? null,
    status: "active",
    phone: input.phone ?? null,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.collection(USERS_COLLECTION).doc(input.uid).set(profile);
  return profile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid" | "createdAt">>
): Promise<UserProfile | null> {
  const db = getAdminFirestore();
  const docRef = db.collection(USERS_COLLECTION).doc(uid);
  const doc = await docRef.get();
  
  if (!doc.exists) return null;
  
  const now = new Date().toISOString();
  const updatedData = { ...updates, updatedAt: now };
  
  await docRef.update(updatedData);
  
  const updated = await docRef.get();
  return { uid, ...updated.data() } as UserProfile;
}

export async function updateLastLogin(uid: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(USERS_COLLECTION).doc(uid).update({
    lastLoginAt: new Date().toISOString(),
  });
}

export async function setUserStatus(uid: string, status: "active" | "disabled"): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(USERS_COLLECTION).doc(uid).update({
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(USERS_COLLECTION).get();
  
  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  })) as UserProfile[];
}
