// ============================================
// ASG Leads — Firestore Lead Persistence Tests
// ============================================
// Tests lead CRUD, activities, follow-ups, and authorization
// against the Firebase emulator.
//
// Run with: npm run test:leads (emulator must be running)

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "admin-uid";
const PERTH_MANAGER_UID = "perth-manager-uid";
const BRISBANE_MANAGER_UID = "brisbane-manager-uid";
const PERTH_REP_UID = "perth-rep-uid";
const BRISBANE_REP_UID = "brisbane-rep-uid";
const DISABLED_UID = "disabled-uid";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "asg-leads-test",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "localhost",
      port: 8080,
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Seed users
    await setDoc(doc(db, "users", ADMIN_UID), {
      uid: ADMIN_UID,
      email: "admin@test.firestore",
      displayName: "Admin User",
      role: "admin",
      officeIds: ["perth", "brisbane"],
      primaryOfficeId: "perth",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "users", PERTH_MANAGER_UID), {
      uid: PERTH_MANAGER_UID,
      email: "pm@test.firestore",
      displayName: "Perth Manager",
      role: "manager",
      officeIds: ["perth"],
      primaryOfficeId: "perth",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "users", BRISBANE_MANAGER_UID), {
      uid: BRISBANE_MANAGER_UID,
      email: "bm@test.firestore",
      displayName: "Brisbane Manager",
      role: "manager",
      officeIds: ["brisbane"],
      primaryOfficeId: "brisbane",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "users", PERTH_REP_UID), {
      uid: PERTH_REP_UID,
      email: "pr@test.firestore",
      displayName: "Perth Rep",
      role: "rep",
      officeIds: ["perth"],
      primaryOfficeId: "perth",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "users", BRISBANE_REP_UID), {
      uid: BRISBANE_REP_UID,
      email: "br@test.firestore",
      displayName: "Brisbane Rep",
      role: "rep",
      officeIds: ["brisbane"],
      primaryOfficeId: "brisbane",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "users", DISABLED_UID), {
      uid: DISABLED_UID,
      email: "disabled@test.firestore",
      displayName: "Disabled User",
      role: "rep",
      officeIds: ["perth"],
      primaryOfficeId: "perth",
      status: "disabled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed leads
    await setDoc(doc(db, "leads", "perth-lead-1"), {
      leadId: "perth-lead-1",
      name: "Perth Lead 1",
      mobile: "0412 345 678",
      mobileNormalized: "+61412345678",
      address: "12 Victoria Avenue",
      suburb: "Perth CBD",
      officeId: "perth",
      assignedRepId: PERTH_REP_UID,
      source: "community_survey",
      status: "new",
      notes: null,
      survey: null,
      createdAt: new Date().toISOString(),
      createdBy: ADMIN_UID,
      updatedAt: new Date().toISOString(),
      updatedBy: ADMIN_UID,
      lastContactAt: null,
      nextFollowUpAt: null,
      activeCallLease: null,
      archivedAt: null,
      version: 0,
    });

    await setDoc(doc(db, "leads", "brisbane-lead-1"), {
      leadId: "brisbane-lead-1",
      name: "Brisbane Lead 1",
      mobile: "0423 456 789",
      mobileNormalized: "+61423456789",
      address: "88 Queen Street",
      suburb: "Brisbane CBD",
      officeId: "brisbane",
      assignedRepId: BRISBANE_REP_UID,
      source: "manual_entry",
      status: "new",
      notes: null,
      survey: null,
      createdAt: new Date().toISOString(),
      createdBy: ADMIN_UID,
      updatedAt: new Date().toISOString(),
      updatedBy: ADMIN_UID,
      lastContactAt: null,
      nextFollowUpAt: null,
      activeCallLease: null,
      archivedAt: null,
      version: 0,
    });

    // Seed activity using client SDK pattern for subcollections
    await setDoc(doc(db, "leads", "perth-lead-1", "activities", "act-1"), {
      activityId: "act-1",
      leadId: "perth-lead-1",
      type: "lead_created",
      description: "Lead created",
      createdAt: new Date().toISOString(),
      createdBy: ADMIN_UID,
    });

    // Seed follow-up
    await setDoc(doc(db, "followUps", "fu-1"), {
      followUpId: "fu-1",
      leadId: "perth-lead-1",
      officeId: "perth",
      assignedRepId: PERTH_REP_UID,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      status: "pending",
      reason: null,
      lastCallResult: null,
      lastNote: null,
      createdAt: new Date().toISOString(),
      createdBy: ADMIN_UID,
      completedAt: null,
      completedBy: null,
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe("LEAD AUTHORIZATION", () => {
  describe("REP ROLE", () => {
    it("can read assigned lead in their office", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertSucceeds(getDoc(doc(rep.firestore(), "leads", "perth-lead-1")));
    });

    it("cannot read Brisbane lead as Perth rep", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertFails(getDoc(doc(rep.firestore(), "leads", "brisbane-lead-1")));
    });

    it("cannot write lead (no direct client write)", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertFails(setDoc(doc(rep.firestore(), "leads", "perth-lead-1"), { status: "contacted" }));
    });

    it("cannot write to activities subcollection", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertFails(setDoc(doc(rep.firestore(), "leads", "perth-lead-1", "activities", "hack"), {
        type: "fake",
      }));
    });
  });

  describe("MANAGER ROLE", () => {
    it("can read lead in their office", async () => {
      const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
      await assertSucceeds(getDoc(doc(manager.firestore(), "leads", "perth-lead-1")));
    });

    it("cannot read Brisbane lead as Perth manager", async () => {
      const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
      await assertFails(getDoc(doc(manager.firestore(), "leads", "brisbane-lead-1")));
    });

    it("can write lead in their office", async () => {
      const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
      await assertSucceeds(setDoc(doc(manager.firestore(), "leads", "perth-lead-1"), {
        leadId: "perth-lead-1",
        name: "Updated Lead",
        mobile: "0412 345 678",
        mobileNormalized: "+61412345678",
        address: "12 Victoria Avenue",
        suburb: "Perth CBD",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
        source: "community_survey",
        status: "contacted",
        notes: null,
        survey: null,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_UID,
        updatedAt: new Date().toISOString(),
        updatedBy: PERTH_MANAGER_UID,
        lastContactAt: null,
        nextFollowUpAt: null,
        activeCallLease: null,
        archivedAt: null,
        version: 1,
      }));
    });
  });

  describe("ADMIN ROLE", () => {
    it("can read Perth lead", async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(getDoc(doc(admin.firestore(), "leads", "perth-lead-1")));
    });

    it("can read Brisbane lead", async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(getDoc(doc(admin.firestore(), "leads", "brisbane-lead-1")));
    });

    it("can write any lead", async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(setDoc(doc(admin.firestore(), "leads", "brisbane-lead-1"), {
        leadId: "brisbane-lead-1",
        name: "Updated Brisbane Lead",
        mobile: "0423 456 789",
        mobileNormalized: "+61423456789",
        address: "88 Queen Street",
        suburb: "Brisbane CBD",
        officeId: "brisbane",
        assignedRepId: BRISBANE_REP_UID,
        source: "manual_entry",
        status: "contacted",
        notes: null,
        survey: null,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_UID,
        updatedAt: new Date().toISOString(),
        updatedBy: ADMIN_UID,
        lastContactAt: null,
        nextFollowUpAt: null,
        activeCallLease: null,
        archivedAt: null,
        version: 1,
      }));
    });
  });

  describe("DISABLED USER", () => {
    it("cannot read any lead", async () => {
      const disabled = testEnv.authenticatedContext(DISABLED_UID);
      await assertFails(getDoc(doc(disabled.firestore(), "leads", "perth-lead-1")));
    });

    it("cannot write any lead", async () => {
      const disabled = testEnv.authenticatedContext(DISABLED_UID);
      await assertFails(setDoc(doc(disabled.firestore(), "leads", "perth-lead-1"), { status: "new" }));
    });
  });

  describe("UNAUTHENTICATED", () => {
    it("cannot read leads", async () => {
      const unauth = testEnv.unauthenticatedContext();
      await assertFails(getDoc(doc(unauth.firestore(), "leads", "perth-lead-1")));
    });

    it("cannot write leads", async () => {
      const unauth = testEnv.unauthenticatedContext();
      await assertFails(setDoc(doc(unauth.firestore(), "leads", "new-lead"), { name: "Test" }));
    });
  });
});

describe("FOLLOW-UP AUTHORIZATION", () => {
  describe("REP ROLE", () => {
    it("can read their follow-ups", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertSucceeds(getDoc(doc(rep.firestore(), "followUps", "fu-1")));
    });

    it("cannot write follow-ups directly", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertFails(setDoc(doc(rep.firestore(), "followUps", "fu-1"), { status: "completed" }));
    });
  });

  describe("MANAGER ROLE", () => {
    it("can read follow-ups in their office", async () => {
      const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
      await assertSucceeds(getDoc(doc(manager.firestore(), "followUps", "fu-1")));
    });

    it("can write follow-ups in their office", async () => {
      const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
      await assertSucceeds(setDoc(doc(manager.firestore(), "followUps", "fu-1"), {
        followUpId: "fu-1",
        leadId: "perth-lead-1",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
        scheduledAt: new Date().toISOString(),
        status: "completed",
        reason: null,
        lastCallResult: null,
        lastNote: null,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_UID,
        completedAt: new Date().toISOString(),
        completedBy: PERTH_MANAGER_UID,
      }));
    });
  });

  describe("ADMIN ROLE", () => {
    it("can read all follow-ups", async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(getDoc(doc(admin.firestore(), "followUps", "fu-1")));
    });

    it("can write all follow-ups", async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(setDoc(doc(admin.firestore(), "followUps", "fu-1"), {
        followUpId: "fu-1",
        leadId: "perth-lead-1",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
        scheduledAt: new Date().toISOString(),
        status: "completed",
        reason: null,
        lastCallResult: null,
        lastNote: null,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_UID,
        completedAt: new Date().toISOString(),
        completedBy: ADMIN_UID,
      }));
    });
  });
});

describe("ACTIVITIES AUTHORIZATION", () => {
  describe("REP ROLE", () => {
    it("can read activities", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertSucceeds(getDoc(doc(rep.firestore(), "leads", "perth-lead-1", "activities", "act-1")));
    });

    it("cannot write activities directly", async () => {
      const rep = testEnv.authenticatedContext(PERTH_REP_UID);
      await assertFails(setDoc(doc(rep.firestore(), "leads", "perth-lead-1", "activities", "hack"), {
        type: "fake",
      }));
    });
  });

  describe("ADMIN ROLE", () => {
    it("can read activities", async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(getDoc(doc(admin.firestore(), "leads", "perth-lead-1", "activities", "act-1")));
    });

    it("cannot write activities directly (server-only)", async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertFails(setDoc(doc(admin.firestore(), "leads", "perth-lead-1", "activities", "hack"), {
        type: "fake",
      }));
    });
  });
});
