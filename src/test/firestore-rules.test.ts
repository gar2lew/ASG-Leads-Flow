// ============================================
// ASG Leads — Firestore Rules Emulator Tests
// ============================================
// Tests security rules against the Firebase emulator
//
// Prerequisites:
//   - Firebase emulators running: firebase emulators:start
//   - Rules deployed to emulator
//
// Run with: npm run test:rules

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
      port: Number(process.env.FIRESTORE_EMULATOR_PORT) || 8080,
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

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

    await setDoc(doc(db, "leads", "perth-lead-1"), {
      leadId: "perth-lead-1",
      name: "Perth Lead 1",
      officeId: "perth",
      assignedRepId: PERTH_REP_UID,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "leads", "brisbane-lead-1"), {
      leadId: "brisbane-lead-1",
      name: "Brisbane Lead 1",
      officeId: "brisbane",
      assignedRepId: BRISBANE_REP_UID,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe("UNAUTHENTICATED USERS", () => {
  it("cannot read user profiles", async () => {
    const unauthenticated = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthenticated.firestore(), "users", ADMIN_UID)));
  });

  it("cannot read leads", async () => {
    const unauthenticated = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(unauthenticated.firestore(), "leads", "perth-lead-1")));
  });

  it("cannot write leads", async () => {
    const unauthenticated = testEnv.unauthenticatedContext();
    await assertFails(setDoc(doc(unauthenticated.firestore(), "leads", "new-lead"), { name: "Test" }));
  });

  it("cannot list users collection", async () => {
    const unauthenticated = testEnv.unauthenticatedContext();
    await assertFails(getDocs(collection(unauthenticated.firestore(), "users")));
  });
});

describe("REP ROLE", () => {
  it("can read own profile", async () => {
    const rep = testEnv.authenticatedContext(PERTH_REP_UID);
    await assertSucceeds(getDoc(doc(rep.firestore(), "users", PERTH_REP_UID)));
  });

  it("cannot read unrelated user profile", async () => {
    const rep = testEnv.authenticatedContext(PERTH_REP_UID);
    await assertFails(getDoc(doc(rep.firestore(), "users", BRISBANE_REP_UID)));
  });

  it("cannot access Brisbane lead as Perth rep", async () => {
    const rep = testEnv.authenticatedContext(PERTH_REP_UID);
    await assertFails(getDoc(doc(rep.firestore(), "leads", "brisbane-lead-1")));
  });

  it("can access Perth lead assigned to them", async () => {
    const rep = testEnv.authenticatedContext(PERTH_REP_UID);
    await assertSucceeds(getDoc(doc(rep.firestore(), "leads", "perth-lead-1")));
  });

  it("cannot perform admin writes (create user)", async () => {
    const rep = testEnv.authenticatedContext(PERTH_REP_UID);
    await assertFails(setDoc(doc(rep.firestore(), "users", "new-user"), { name: "Test" }));
  });

  it("cannot access admin-only collections", async () => {
    const rep = testEnv.authenticatedContext(PERTH_REP_UID);
    await assertFails(getDocs(collection(rep.firestore(), "auditEvents")));
  });
});

describe("MANAGER ROLE", () => {
  it("can access permitted Perth resources", async () => {
    const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
    await assertSucceeds(getDoc(doc(manager.firestore(), "leads", "perth-lead-1")));
  });

  it("cannot access Brisbane resources as Perth manager", async () => {
    const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
    await assertFails(getDoc(doc(manager.firestore(), "leads", "brisbane-lead-1")));
  });

  it("cannot perform global admin operations", async () => {
    const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
    await assertFails(setDoc(doc(manager.firestore(), "users", "new-user"), { name: "Test" }));
  });

  it("can read user profiles for their office", async () => {
    const manager = testEnv.authenticatedContext(PERTH_MANAGER_UID);
    await assertSucceeds(getDoc(doc(manager.firestore(), "users", PERTH_REP_UID)));
  });
});

describe("ADMIN ROLE", () => {
  it("can access Perth resources", async () => {
    const admin = testEnv.authenticatedContext(ADMIN_UID);
    await assertSucceeds(getDoc(doc(admin.firestore(), "leads", "perth-lead-1")));
  });

  it("can access Brisbane resources", async () => {
    const admin = testEnv.authenticatedContext(ADMIN_UID);
    await assertSucceeds(getDoc(doc(admin.firestore(), "leads", "brisbane-lead-1")));
  });

  it("can perform permitted user administration", async () => {
    const admin = testEnv.authenticatedContext(ADMIN_UID);
    await assertSucceeds(setDoc(doc(admin.firestore(), "users", "new-user"), {
      uid: "new-user",
      role: "rep",
      officeIds: ["perth"],
      status: "active",
    }));
  });

  it("can access audit events", async () => {
    const admin = testEnv.authenticatedContext(ADMIN_UID);
    await assertSucceeds(getDocs(collection(admin.firestore(), "auditEvents")));
  });
});

describe("DISABLED USER", () => {
  it("cannot access protected resources", async () => {
    const disabled = testEnv.authenticatedContext(DISABLED_UID);
    await assertFails(getDoc(doc(disabled.firestore(), "users", DISABLED_UID)));
  });

  it("cannot read leads", async () => {
    const disabled = testEnv.authenticatedContext(DISABLED_UID);
    await assertFails(getDoc(doc(disabled.firestore(), "leads", "perth-lead-1")));
  });

  it("cannot write leads", async () => {
    const disabled = testEnv.authenticatedContext(DISABLED_UID);
    await assertFails(setDoc(doc(disabled.firestore(), "leads", "new-lead"), { name: "Test" }));
  });
});
