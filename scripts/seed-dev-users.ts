// ============================================
// ASG Leads — Development Seed Script
// ============================================
// Creates test users for local development only
//
// WARNING: This script is for development use only.
// Do NOT run against production projects.
//
// Usage:
//   npx tsx scripts/seed-dev-users.ts
//
// Prerequisites:
//   - Firebase emulators running (auth + firestore)
//   - FIREBASE_ADMIN_* environment variables set
//
// Created test users (all with password: Password123!):
//   - rep.perth@example.test (Rep, Perth)
//   - rep.brisbane@example.test (Rep, Brisbane)
//   - manager.perth@example.test (Manager, Perth)
//   - manager.brisbane@example.test (Manager, Brisbane)
//   - admin@example.test (Admin, both offices)

import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

const DEV_PASSWORD = "Password123!";

const DEV_USERS = [
  { email: "rep.perth@example.test", displayName: "Perth Rep", role: "rep", officeIds: ["perth"], primaryOfficeId: "perth" },
  { email: "rep.brisbane@example.test", displayName: "Brisbane Rep", role: "rep", officeIds: ["brisbane"], primaryOfficeId: "brisbane" },
  { email: "manager.perth@example.test", displayName: "Perth Manager", role: "manager", officeIds: ["perth"], primaryOfficeId: "perth" },
  { email: "manager.brisbane@example.test", displayName: "Brisbane Manager", role: "manager", officeIds: ["brisbane"], primaryOfficeId: "brisbane" },
  { email: "admin@example.test", displayName: "Admin User", role: "admin", officeIds: ["perth", "brisbane"], primaryOfficeId: "perth" },
];

async function seedDevUsers() {
  console.log("Seeding development users...");
  console.log(`Password for all users: ${DEV_PASSWORD}`);
  console.log("");

  for (const user of DEV_USERS) {
    try {
      // Create or update Firebase Auth user
      let authRecord;
      try {
        authRecord = await getAdminAuth().getUserByEmail(user.email);
        // Update password if user exists
        await getAdminAuth().updateUser(authRecord.uid, { password: DEV_PASSWORD });
      } catch {
        // Create new user
        authRecord = await getAdminAuth().createUser({
          email: user.email,
          password: DEV_PASSWORD,
          displayName: user.displayName,
        });
      }

      // Set custom claims
      await getAdminAuth().setCustomUserClaims(authRecord.uid, {
        role: user.role,
        officeIds: user.officeIds,
      });

      // Create Firestore profile
      const now = new Date().toISOString();
      const profile = {
        uid: authRecord.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        officeIds: user.officeIds,
        primaryOfficeId: user.primaryOfficeId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      await getAdminFirestore().collection(COLLECTIONS.USERS).doc(authRecord.uid).set(profile, { merge: true });

      console.log(`  ✓ ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`  ✗ ${user.email}:`, err);
    }
  }

  console.log("");
  console.log("Seeding complete!");
}

// Only run if executed directly
if (require.main === module) {
  seedDevUsers().catch(console.error);
}

export { seedDevUsers, DEV_USERS, DEV_PASSWORD };
