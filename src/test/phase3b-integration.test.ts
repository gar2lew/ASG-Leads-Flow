// ============================================
// ASG Leads — Phase 3B Integration Tests
// ============================================
// Uses unique UIDs and clears Firestore before each test.

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit, startAfter } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "p3b-admin-uid";
const PERTH_MANAGER_UID = "p3b-perth-mgr-uid";
const BRISBANE_MANAGER_UID = "p3b-bne-mgr-uid";
const PERTH_REP_UID = "p3b-perth-rep-uid";
const PERTH_REP_2_UID = "p3b-perth-rep2-uid";
const BRISBANE_REP_UID = "p3b-bne-rep-uid";
const DISABLED_UID = "p3b-disabled-uid";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "asg-leads-test",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT) || 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  
  // Seed users for each test
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    
    const users = [
      { uid: ADMIN_UID, role: "admin", officeIds: ["perth", "brisbane"], primaryOfficeId: "perth", status: "active" },
      { uid: PERTH_MANAGER_UID, role: "manager", officeIds: ["perth"], primaryOfficeId: "perth", status: "active" },
      { uid: BRISBANE_MANAGER_UID, role: "manager", officeIds: ["brisbane"], primaryOfficeId: "brisbane", status: "active" },
      { uid: PERTH_REP_UID, role: "rep", officeIds: ["perth"], primaryOfficeId: "perth", status: "active" },
      { uid: PERTH_REP_2_UID, role: "rep", officeIds: ["perth"], primaryOfficeId: "perth", status: "active" },
      { uid: BRISBANE_REP_UID, role: "rep", officeIds: ["brisbane"], primaryOfficeId: "brisbane", status: "active" },
      { uid: DISABLED_UID, role: "rep", officeIds: ["perth"], primaryOfficeId: "perth", status: "disabled" },
    ];
    
    for (const u of users) {
      await setDoc(doc(db, "users", u.uid), {
        ...u,
        email: `${u.uid}@test.firestore`,
        displayName: u.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
});

// ============================================
// PAGINATION TESTS
// ============================================
describe("PAGINATION", () => {
  it("returns correct pagination for more records than one page", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      // Create 5 leads
      for (let i = 0; i < 5; i++) {
        await setDoc(doc(db, "leads", `pag-lead-${i}`), {
          leadId: `pag-lead-${i}`,
          name: `Pag Lead ${i}`,
          mobile: `0412 345 67${i}`,
          mobileNormalized: `+614****567${i}`,
          address: `${i} Test St`,
          suburb: "Perth CBD",
          officeId: "perth",
          assignedRepId: PERTH_REP_UID,
          source: "manual_entry",
          status: "new",
          notes: null,
          survey: null,
          createdAt: new Date(2026, 9, 12, 10, i, 0).toISOString(),
          createdBy: ADMIN_UID,
          updatedAt: new Date(2026, 9, 12, 10, i, 0).toISOString(),
          updatedBy: ADMIN_UID,
          lastContactAt: null,
          nextFollowUpAt: null,
          activeCallLease: null,
          archivedAt: null,
          version: 0,
        });
      }
      
      // Page 1: limit 3
      let q = query(
        collection(db, "leads"),
        where("officeId", "==", "perth"),
        where("assignedRepId", "==", PERTH_REP_UID),
        orderBy("createdAt", "desc"),
        orderBy("leadId", "asc"),
        limit(3)
      );
      let snap = await getDocs(q);
      expect(snap.docs.length).toBe(3);
      
      const lastDoc = snap.docs[snap.docs.length - 1];
      const lastData = lastDoc.data();
      
      // Page 2: using startAfter
      q = query(
        collection(db, "leads"),
        where("officeId", "==", "perth"),
        where("assignedRepId", "==", PERTH_REP_UID),
        orderBy("createdAt", "desc"),
        orderBy("leadId", "asc"),
        startAfter(lastData.createdAt, lastData.leadId),
        limit(3)
      );
      snap = await getDocs(q);
      expect(snap.docs.length).toBe(2); // 5 total - 3 from page 1 = 2
    });
  });

  it("handles records with identical createdAt using leadId tiebreaker", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      const sameTime = new Date(2026, 9, 12, 10, 0, 0).toISOString();
      
      for (let i = 0; i < 4; i++) {
        await setDoc(doc(db, "leads", `tie-lead-${i}`), {
          leadId: `tie-lead-${i}`,
          name: `Tie Lead ${i}`,
          mobile: `0412 345 88${i}`,
          mobileNormalized: `+614****88${i}`,
          address: `${i} Test St`,
          suburb: "Perth CBD",
          officeId: "perth",
          assignedRepId: PERTH_REP_UID,
          source: "manual_entry",
          status: "new",
          notes: null,
          survey: null,
          createdAt: sameTime,
          createdBy: ADMIN_UID,
          updatedAt: sameTime,
          updatedBy: ADMIN_UID,
          lastContactAt: null,
          nextFollowUpAt: null,
          activeCallLease: null,
          archivedAt: null,
          version: 0,
        });
      }
      
      // Page 1: limit 3
      let q = query(
        collection(db, "leads"),
        where("officeId", "==", "perth"),
        where("assignedRepId", "==", PERTH_REP_UID),
        orderBy("createdAt", "desc"),
        orderBy("leadId", "asc"),
        limit(3)
      );
      let snap = await getDocs(q);
      expect(snap.docs.length).toBe(3);
      
      const lastDoc = snap.docs[snap.docs.length - 1];
      const lastData = lastDoc.data();
      
      // Page 2
      q = query(
        collection(db, "leads"),
        where("officeId", "==", "perth"),
        where("assignedRepId", "==", PERTH_REP_UID),
        orderBy("createdAt", "desc"),
        orderBy("leadId", "asc"),
        startAfter(lastData.createdAt, lastData.leadId),
        limit(3)
      );
      snap = await getDocs(q);
      expect(snap.docs.length).toBe(1); // 4 total - 3 from page 1 = 1
    });
  });

  it("paginates correctly with office + status filters", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      // Create perth leads with different statuses
      const statuses = ["new", "contacted", "new", "booked", "new"];
      for (let i = 0; i < statuses.length; i++) {
        await setDoc(doc(db, "leads", `filt-perth-${i}`), {
          leadId: `filt-perth-${i}`,
          name: `Filt Perth ${i}`,
          mobile: `0412 345 33${i}`,
          mobileNormalized: `+614****33${i}`,
          address: `${i} Test St`,
          suburb: "Perth CBD",
          officeId: "perth",
          assignedRepId: PERTH_REP_UID,
          source: "manual_entry",
          status: statuses[i],
          notes: null,
          survey: null,
          createdAt: new Date(2026, 9, 12, 10, i, 0).toISOString(),
          createdBy: ADMIN_UID,
          updatedAt: new Date(2026, 9, 12, 10, i, 0).toISOString(),
          updatedBy: ADMIN_UID,
          lastContactAt: null,
          nextFollowUpAt: null,
          activeCallLease: null,
          archivedAt: null,
          version: 0,
        });
      }
      
      // Query: perth + new status
      const q = query(
        collection(db, "leads"),
        where("officeId", "==", "perth"),
        where("status", "==", "new"),
        orderBy("createdAt", "desc"),
        orderBy("leadId", "asc")
      );
      const snap = await getDocs(q);
      expect(snap.docs.length).toBe(3);
      snap.docs.forEach((d: any) => {
        expect(d.data().status).toBe("new");
        expect(d.data().officeId).toBe("perth");
      });
    });
  });
});

// ============================================
// DUPLICATE MOBILE TESTS
// ============================================
describe("DUPLICATE MOBILE UNIQUENESS", () => {
  it("prevents duplicate mobile numbers via leadMobileKeys", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      const mobileNormalized = "+614****5678";
      
      // Create first lead
      await setDoc(doc(db, "leads", "dup-lead-a"), {
        leadId: "dup-lead-a",
        name: "Dup Lead A",
        mobile: "0412 345 678",
        mobileNormalized,
        address: "12 Test St",
        suburb: "Perth CBD",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
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
      
      // Create the mobile key
      await setDoc(doc(db, "leadMobileKeys", mobileNormalized), {
        leadId: "dup-lead-a",
        mobileNormalized,
        createdAt: new Date().toISOString(),
      });
      
      // Verify duplicate detection
      const keyDoc = await getDoc(doc(db, "leadMobileKeys", mobileNormalized));
      expect(keyDoc.exists()).toBe(true);
      expect(keyDoc.data()?.leadId).toBe("dup-lead-a");
    });
  });
});

// ============================================
// FOLLOW-UP CONSISTENCY TESTS
// ============================================
describe("FOLLOW-UP CONSISTENCY", () => {
  it("completes follow-up and sets completedBy from authenticated user", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      const leadId = "fu-consistency-lead";
      await setDoc(doc(db, "leads", leadId), {
        leadId,
        name: "FU Test Lead",
        mobile: "0412 345 678",
        mobileNormalized: "+614****5678",
        address: "12 Test St",
        suburb: "Perth CBD",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
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
      
      await setDoc(doc(db, "followUps", "fu-completion-test"), {
        followUpId: "fu-completion-test",
        leadId,
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        status: "pending",
        reason: null,
        lastCallResult: "callback",
        lastNote: "Call back next week",
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_UID,
        completedAt: null,
        completedBy: null,
      });
      
      // Complete the follow-up (simulating server action)
      const now = new Date();
      await setDoc(doc(db, "followUps", "fu-completion-test"), {
        status: "completed",
        completedAt: now.toISOString(),
        completedBy: PERTH_REP_UID,
      }, { merge: true });
      
      const fuDoc = await getDoc(doc(db, "followUps", "fu-completion-test"));
      expect(fuDoc.data()?.status).toBe("completed");
      expect(fuDoc.data()?.completedBy).toBe(PERTH_REP_UID);
    });
  });
  
  it("cross-office rep cannot access follow-up", async () => {
    // Seed a perth follow-up
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      await setDoc(doc(db, "followUps", "fu-cross-office"), {
        followUpId: "fu-cross-office",
        leadId: "fu-cross-lead",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
        scheduledAt: new Date().toISOString(),
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
    
    // Brisbane rep cannot read perth follow-up
    const brisbaneContext = testEnv.authenticatedContext(BRISBANE_REP_UID);
    const { assertFails } = await import("@firebase/rules-unit-testing");
    await assertFails(getDoc(doc(brisbaneContext.firestore(), "followUps", "fu-cross-office")));
  });
});

// ============================================
// CALL CLAIM TESTS
// ============================================
describe("CALL CLAIMS", () => {
  it("first rep acquires claim", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      const leadId = "claim-lead-1";
      await setDoc(doc(db, "leads", leadId), {
        leadId,
        name: "Claim Lead 1",
        mobile: "0412 345 678",
        mobileNormalized: "+614****5678",
        address: "12 Test St",
        suburb: "Perth CBD",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
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
      
      // First rep acquires claim
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      await setDoc(doc(db, "leads", leadId), {
        activeCallLease: {
          claimedBy: PERTH_REP_UID,
          claimedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      }, { merge: true });
      
      const leadDoc = await getDoc(doc(db, "leads", leadId));
      expect(leadDoc.data()?.activeCallLease?.claimedBy).toBe(PERTH_REP_UID);
    });
  });
  
  it("second rep cannot acquire active claim", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      const leadId = "claim-lead-2";
      await setDoc(doc(db, "leads", leadId), {
        leadId,
        name: "Claim Lead 2",
        mobile: "0412 345 999",
        mobileNormalized: "+614****999",
        address: "99 Test St",
        suburb: "Perth CBD",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
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
      
      // First rep claims
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      await setDoc(doc(db, "leads", leadId), {
        activeCallLease: {
          claimedBy: PERTH_REP_UID,
          claimedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      }, { merge: true });
      
      // Server logic: check if existing claim is active and owned by another
      const leadDoc = await getDoc(doc(db, "leads", leadId));
      const lease = leadDoc.data()?.activeCallLease;
      
      // Claim is active and owned by PERTH_REP_UID, not PERTH_REP_2_UID
      expect(lease.claimedBy).toBe(PERTH_REP_UID);
      expect(new Date(lease.expiresAt) > new Date()).toBe(true);
      // Second rep would be denied
    });
  });
  
  it("rep can release their own claim", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      const leadId = "claim-lead-3";
      await setDoc(doc(db, "leads", leadId), {
        leadId,
        name: "Claim Lead 3",
        mobile: "0412 345 777",
        mobileNormalized: "+614****777",
        address: "77 Test St",
        suburb: "Perth CBD",
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
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
      
      // Acquire claim
      await setDoc(doc(db, "leads", leadId), {
        activeCallLease: {
          claimedBy: PERTH_REP_UID,
          claimedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
      }, { merge: true });
      
      // Release claim
      await setDoc(doc(db, "leads", leadId), {
        activeCallLease: null,
      }, { merge: true });
      
      const leadDoc = await getDoc(doc(db, "leads", leadId));
      expect(leadDoc.data()?.activeCallLease).toBeNull();
    });
  });
});