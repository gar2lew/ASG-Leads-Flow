// ============================================
// ASG Leads — Set Admin Script
// ============================================
// Development/ops utility to bootstrap the first admin account
//
// Usage:
//   npx tsx scripts/set-admin.ts <uid> <email> <displayName>
//
// This script:
// 1. Sets custom claims (role: admin, officeIds: [perth, brisbane])
// 2. Creates/updates the Firestore user profile
//
// IMPORTANT:
// - The Firebase Auth user must already exist
// - Do not use in production without explicit confirmation
// - Requires FIREBASE_ADMIN_* environment variables

import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

interface AdminSetupResult {
  uid: string;
  email: string;
  displayName: string;
  claims: { role: string; officeIds: string[] };
  profileCreated: boolean;
}

async function setAdmin(uid: string, email: string, displayName: string): Promise<AdminSetupResult> {
  // Set custom claims
  await getAdminAuth().setCustomUserClaims(uid, {
    role: "admin",
    officeIds: ["perth", "brisbane"],
  });

  // Create/update Firestore profile
  const now = new Date().toISOString();
  const profile = {
    uid,
    email,
    displayName,
    role: "admin" as const,
    officeIds: ["perth", "brisbane"] as const,
    primaryOfficeId: "perth" as const,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };

  await getAdminFirestore().collection(COLLECTIONS.USERS).doc(uid).set(profile, { merge: true });

  return {
    uid,
    email,
    displayName,
    claims: { role: "admin", officeIds: ["perth", "brisbane"] },
    profileCreated: true,
  };
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error("Usage: npx tsx scripts/set-admin.ts <uid> <email> <displayName>");
    console.error("Example: npx tsx scripts/set-admin.ts abc123 admin@example.test \"Admin User\"");
    process.exit(1);
  }

  const [uid, email, displayName] = args;

  console.log(`Setting admin claims for ${email} (UID: ${uid})...`);
  
  try {
    const result = await setAdmin(uid, email, displayName);
    console.log("Success:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  main();
}

export { setAdmin };
