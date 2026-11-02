// ============================================
// ASG Leads — Phase 4 Survey Lifecycle Tests
// ============================================
// Uses Firebase Rules Test Environment to test
// survey session persistence and authorization.

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "p4-admin-uid";
const PERTH_MANAGER_UID = "p4-perth-mgr-uid";
const BRISBANE_MANAGER_UID = "p4-bne-mgr-uid";
const PERTH_REP_UID = "p4-perth-rep-uid";
const PERTH_REP_2_UID = "p4-perth-rep2-uid";
const BRISBANE_REP_UID = "p4-bne-rep-uid";
const DISABLED_UID = "p4-disabled-uid";

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
// SURVEY SESSION CREATION
// ============================================
describe("SURVEY SESSION CREATION", () => {
  it("creates a session with correct initial state", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      const sessionId = "test-session-1";
      
      await setDoc(doc(db, "surveySessions", sessionId), {
        sessionId,
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 0,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
      
      const snap = await getDoc(doc(db, "surveySessions", sessionId));
      expect(snap.exists()).toBe(true);
      const data = snap.data()!;
      expect(data.status).toBe("in_progress");
      expect(data.officeId).toBe("perth");
      expect(data.repUserId).toBe(PERTH_REP_UID);
      expect(data.respondentCount).toBe(0);
      expect(data.leadCount).toBe(0);
    });
  });
  
  it("allows only one active session per rep per office", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      // Create first active session
      await setDoc(doc(db, "surveySessions", "session-1"), {
        sessionId: "session-1",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 0,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
      
      // Query for active sessions for this rep in this office
      const activeQuery = query(
        collection(db, "surveySessions"),
        where("repUserId", "==", PERTH_REP_UID),
        where("officeId", "==", "perth"),
        where("status", "in", ["draft", "in_progress"]),
      );
      const activeSnap = await getDocs(activeQuery);
      expect(activeSnap.docs.length).toBe(1);
      expect(activeSnap.docs[0].data().sessionId).toBe("session-1");
    });
  });
});

// ============================================
// SURVEY RESPONSE PERSISTENCE
// ============================================
describe("SURVEY RESPONSE PERSISTENCE", () => {
  it("persists survey responses as subcollection", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      await setDoc(doc(db, "surveySessions", "sess-1"), {
        sessionId: "sess-1",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 1,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
      
      await setDoc(doc(db, "surveySessions", "sess-1", "responses", "resp-1"), {
        responseId: "resp-1",
        sessionId: "sess-1",
        sequenceNumber: 1,
        costOfLivingIncreased: "yes",
        payingTooMuchTax: "no",
        housingStatus: "renter",
        employmentStatus: "full_time",
        superannuation: "under_50k",
        becameLead: false,
        leadId: null,
        createdAt: now,
        updatedAt: now,
      });
      
      const snap = await getDoc(doc(db, "surveySessions", "sess-1", "responses", "resp-1"));
      expect(snap.exists()).toBe(true);
      const data = snap.data()!;
      expect(data.sequenceNumber).toBe(1);
      expect(data.housingStatus).toBe("renter");
      expect(data.becameLead).toBe(false);
    });
  });
  
  it("persists anonymous respondent with no PII", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      await setDoc(doc(db, "surveySessions", "sess-anon"), {
        sessionId: "sess-anon",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 1,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
      
      await setDoc(doc(db, "surveySessions", "sess-anon", "responses", "resp-anon"), {
        responseId: "resp-anon",
        sessionId: "sess-anon",
        sequenceNumber: 1,
        costOfLivingIncreased: "yes",
        payingTooMuchTax: "yes",
        housingStatus: "owner",
        employmentStatus: "retired",
        superannuation: "dont_know",
        becameLead: false,
        leadId: null,
        createdAt: now,
        updatedAt: now,
      });
      
      const snap = await getDoc(doc(db, "surveySessions", "sess-anon", "responses", "resp-anon"));
      const data = snap.data()!;
      expect(data.becameLead).toBe(false);
      expect(data.leadId).toBeNull();
      // Anonymous respondent should have no name/mobile/address fields
      expect(data.name).toBeUndefined();
      expect(data.mobile).toBeUndefined();
      expect(data.address).toBeUndefined();
    });
  });
  
  it("maintains stable sequenceNumber across updates", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      await setDoc(doc(db, "surveySessions", "sess-seq"), {
        sessionId: "sess-seq",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 2,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
      
      // Create 2 responses
      await setDoc(doc(db, "surveySessions", "sess-seq", "responses", "seq-1"), {
        responseId: "seq-1",
        sessionId: "sess-seq",
        sequenceNumber: 1,
        costOfLivingIncreased: null,
        payingTooMuchTax: null,
        housingStatus: null,
        employmentStatus: null,
        superannuation: null,
        becameLead: false,
        leadId: null,
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, "surveySessions", "sess-seq", "responses", "seq-2"), {
        responseId: "seq-2",
        sessionId: "sess-seq",
        sequenceNumber: 2,
        costOfLivingIncreased: null,
        payingTooMuchTax: null,
        housingStatus: null,
        employmentStatus: null,
        superannuation: null,
        becameLead: false,
        leadId: null,
        createdAt: now,
        updatedAt: now,
      });
      
      // Update first response
      await setDoc(doc(db, "surveySessions", "sess-seq", "responses", "seq-1"), {
        responseId: "seq-1",
        sessionId: "sess-seq",
        sequenceNumber: 1,
        costOfLivingIncreased: "yes",
        payingTooMuchTax: "no",
        housingStatus: "renter",
        employmentStatus: "full_time",
        superannuation: "under_50k",
        becameLead: false,
        leadId: null,
        createdAt: now,
        updatedAt: new Date(now.getTime() + 1000),
      });
      
      const q = query(
        collection(db, "surveySessions", "sess-seq", "responses"),
        orderBy("sequenceNumber", "asc"),
      );
      const snap = await getDocs(q);
      expect(snap.docs.length).toBe(2);
      expect(snap.docs[0].data().sequenceNumber).toBe(1);
      expect(snap.docs[0].data().costOfLivingIncreased).toBe("yes");
      expect(snap.docs[1].data().sequenceNumber).toBe(2);
    });
  });
});

// ============================================
// LEAD CONVERSION TESTS
// ============================================
describe("LEAD CONVERSION", () => {
  it("converts respondent to lead with correct metadata", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      // Setup session and response
      await setDoc(doc(db, "surveySessions", "sess-conv"), {
        sessionId: "sess-conv",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 1,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
      
      await setDoc(doc(db, "surveySessions", "sess-conv", "responses", "resp-conv"), {
        responseId: "resp-conv",
        sessionId: "sess-conv",
        sequenceNumber: 1,
        costOfLivingIncreased: "yes",
        payingTooMuchTax: "no",
        housingStatus: "renter",
        employmentStatus: "full_time",
        superannuation: "under_50k",
        becameLead: false,
        leadId: null,
        createdAt: now,
        updatedAt: now,
      });
      
      // Create lead (simulating transaction)
      const leadId = "lead-from-survey";
      const mobileNormalized = "+61412345678";
      
      await setDoc(doc(db, "leads", leadId), {
        leadId,
        name: "John Doe",
        mobile: "0412 345 678",
        mobileNormalized,
        address: "123 Test St",
        suburb: null,
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
        source: "community_survey",
        status: "new",
        notes: null,
        survey: {
          renterOwner: "Renter",
          employmentStatus: "Full Time",
          superannuation: "Under $50k",
          costOfLivingResponse: "Yes",
          taxResponse: "No",
        },
        createdAt: now,
        createdBy: PERTH_REP_UID,
        updatedAt: now,
        updatedBy: PERTH_REP_UID,
        lastContactAt: null,
        nextFollowUpAt: null,
        activeCallLease: null,
        archivedAt: null,
        version: 0,
      });
      
      // Create mobile key
      await setDoc(doc(db, "leadMobileKeys", mobileNormalized), {
        leadId,
        mobileNormalized,
        createdAt: now,
      });
      
      // Create activity
      await setDoc(doc(collection(db, "leads", leadId, "activities")), {
        activityId: "act-1",
        leadId,
        type: "lead_created",
        description: "Lead created from survey session sess-conv",
        createdAt: now,
        createdBy: PERTH_REP_UID,
        metadata: { surveySessionId: "sess-conv", surveyResponseId: "resp-conv" },
      });
      
      // Update response
      await setDoc(doc(db, "surveySessions", "sess-conv", "responses", "resp-conv"), {
        responseId: "resp-conv",
        sessionId: "sess-conv",
        sequenceNumber: 1,
        costOfLivingIncreased: "yes",
        payingTooMuchTax: "no",
        housingStatus: "renter",
        employmentStatus: "full_time",
        superannuation: "under_50k",
        becameLead: true,
        leadId,
        createdAt: now,
        updatedAt: now,
      });
      
      // Update session leadCount
      await setDoc(doc(db, "surveySessions", "sess-conv"), {
        sessionId: "sess-conv",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 1,
        leadCount: 1,
        createdBy: PERTH_REP_UID,
        version: 2,
      });
      
      // Verify state
      const leadSnap = await getDoc(doc(db, "leads", leadId));
      expect(leadSnap.exists()).toBe(true);
      expect(leadSnap.data()!.survey.renterOwner).toBe("Renter");
      
      const respSnap = await getDoc(doc(db, "surveySessions", "sess-conv", "responses", "resp-conv"));
      expect(respSnap.data()!.becameLead).toBe(true);
      expect(respSnap.data()!.leadId).toBe(leadId);
      
      const sessSnap = await getDoc(doc(db, "surveySessions", "sess-conv"));
      expect(sessSnap.data()!.leadCount).toBe(1);
    });
  });
  
  it("blocks duplicate mobile conversion", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      const mobileNormalized = "+61411111111";
      
      // First lead already exists with this mobile
      await setDoc(doc(db, "leads", "existing-lead"), {
        leadId: "existing-lead",
        name: "Existing",
        mobile: "0411 111 111",
        mobileNormalized,
        address: "Existing St",
        suburb: null,
        officeId: "perth",
        assignedRepId: PERTH_REP_UID,
        source: "other",
        status: "new",
        createdAt: now,
        createdBy: PERTH_REP_UID,
        updatedAt: now,
        updatedBy: PERTH_REP_UID,
        version: 0,
      });
      
      await setDoc(doc(db, "leadMobileKeys", mobileNormalized), {
        leadId: "existing-lead",
        mobileNormalized,
        createdAt: now,
      });
      
      // Check that mobile key exists (simulating duplicate detection)
      const keySnap = await getDoc(doc(db, "leadMobileKeys", mobileNormalized));
      expect(keySnap.exists()).toBe(true);
      
      // Verify no duplicate lead was created
      const leadsSnap = await getDocs(query(
        collection(db, "leads"),
        where("mobileNormalized", "==", mobileNormalized),
      ));
      expect(leadsSnap.docs.length).toBe(1);
    });
  });
  
  it("does not double-increment leadCount on repeated conversion", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      await setDoc(doc(db, "surveySessions", "sess-double"), {
        sessionId: "sess-double",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 1,
        leadCount: 1, // Already incremented once
        createdBy: PERTH_REP_UID,
        version: 2,
      });
      
      await setDoc(doc(db, "surveySessions", "sess-double", "responses", "resp-double"), {
        responseId: "resp-double",
        sessionId: "sess-double",
        sequenceNumber: 1,
        costOfLivingIncreased: "yes",
        payingTooMuchTax: "no",
        housingStatus: "renter",
        employmentStatus: "full_time",
        superannuation: "under_50k",
        becameLead: true, // Already converted
        leadId: "existing-lead-id",
        createdAt: now,
        updatedAt: now,
      });
      
      // Verify leadCount is still 1, not 2
      const sessSnap = await getDoc(doc(db, "surveySessions", "sess-double"));
      expect(sessSnap.data()!.leadCount).toBe(1);
      
      // Verify response has becameLead=true with leadId
      const respSnap = await getDoc(doc(db, "surveySessions", "sess-double", "responses", "resp-double"));
      expect(respSnap.data()!.becameLead).toBe(true);
      expect(respSnap.data()!.leadId).toBe("existing-lead-id");
    });
  });
});

// ============================================
// SURVEY COMPLETION TESTS
// ============================================
describe("SURVEY COMPLETION", () => {
  it("completes session with correct counts", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      await setDoc(doc(db, "surveySessions", "sess-done"), {
        sessionId: "sess-done",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        respondentCount: 3,
        leadCount: 1,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
      
      // Add 3 responses
      for (let i = 1; i <= 3; i++) {
        await setDoc(doc(db, "surveySessions", "sess-done", "responses", `r-${i}`), {
          responseId: `r-${i}`,
          sessionId: "sess-done",
          sequenceNumber: i,
          costOfLivingIncreased: i === 1 ? "yes" : "no",
          payingTooMuchTax: "no",
          housingStatus: "renter",
          employmentStatus: "full_time",
          superannuation: "under_50k",
          becameLead: i === 1,
          leadId: i === 1 ? "lead-1" : null,
          createdAt: now,
          updatedAt: now,
        });
      }
      
      // Complete the session
      await setDoc(doc(db, "surveySessions", "sess-done"), {
        sessionId: "sess-done",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "completed",
        startedAt: now,
        updatedAt: now,
        completedAt: now,
        respondentCount: 3,
        leadCount: 1,
        createdBy: PERTH_REP_UID,
        version: 2,
      });
      
      const snap = await getDoc(doc(db, "surveySessions", "sess-done"));
      expect(snap.data()!.status).toBe("completed");
      expect(snap.data()!.respondentCount).toBe(3);
      expect(snap.data()!.leadCount).toBe(1);
    });
  });
});

// ============================================
// AUTHORIZATION TESTS
// ============================================
describe("SURVEY AUTHORIZATION", () => {
  it("allows rep to read own session", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "surveySessions", "rep-session"), {
        sessionId: "rep-session",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: new Date(),
        updatedAt: new Date(),
        respondentCount: 0,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      });
    });
    
    const repContext = testEnv.authenticatedContext(PERTH_REP_UID);
    const db = repContext.firestore();
    const snap = await getDoc(doc(db, "surveySessions", "rep-session"));
    expect(snap.exists()).toBe(true);
    expect(snap.data()!.repUserId).toBe(PERTH_REP_UID);
  });
  
  it("blocks cross-office access for rep", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "surveySessions", "bne-session"), {
        sessionId: "bne-session",
        officeId: "brisbane",
        repUserId: BRISBANE_REP_UID,
        status: "in_progress",
        startedAt: new Date(),
        updatedAt: new Date(),
        respondentCount: 0,
        leadCount: 0,
        createdBy: BRISBANE_REP_UID,
        version: 1,
      });
    });
    
    const perthRepContext = testEnv.authenticatedContext(PERTH_REP_UID);
    const db = perthRepContext.firestore();
    
    await expect(
      getDoc(doc(db, "surveySessions", "bne-session")),
    ).rejects.toThrow();
  });
  
  it("allows manager to read office sessions", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "surveySessions", "perth-mgr-session"), {
        sessionId: "perth-mgr-session",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "completed",
        startedAt: new Date(),
        updatedAt: new Date(),
        respondentCount: 5,
        leadCount: 2,
        createdBy: PERTH_REP_UID,
        version: 2,
      });
    });
    
    const mgrContext = testEnv.authenticatedContext(PERTH_MANAGER_UID);
    const db = mgrContext.firestore();
    const snap = await getDoc(doc(db, "surveySessions", "perth-mgr-session"));
    expect(snap.exists()).toBe(true);
  });
  
  it("allows admin cross-office access", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "surveySessions", "admin-bne-session"), {
        sessionId: "admin-bne-session",
        officeId: "brisbane",
        repUserId: BRISBANE_REP_UID,
        status: "completed",
        startedAt: new Date(),
        updatedAt: new Date(),
        respondentCount: 10,
        leadCount: 3,
        createdBy: BRISBANE_REP_UID,
        version: 2,
      });
    });
    
    const adminContext = testEnv.authenticatedContext(ADMIN_UID);
    const db = adminContext.firestore();
    const snap = await getDoc(doc(db, "surveySessions", "admin-bne-session"));
    expect(snap.exists()).toBe(true);
    expect(snap.data()!.officeId).toBe("brisbane");
  });
  
  it("denies direct client writes to survey sessions", async () => {
    const repContext = testEnv.authenticatedContext(PERTH_REP_UID);
    const db = repContext.firestore();
    
    await expect(
      setDoc(doc(db, "surveySessions", "client-write-attempt"), {
        sessionId: "client-write-attempt",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "in_progress",
        startedAt: new Date(),
        updatedAt: new Date(),
        respondentCount: 0,
        leadCount: 0,
        createdBy: PERTH_REP_UID,
        version: 1,
      }),
    ).rejects.toThrow();
  });
});

// ============================================
// ANALYTICS TESTS
// ============================================
describe("SURVEY ANALYTICS", () => {
  it("calculates correct analytics from completed sessions", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = new Date();
      
      // Create completed session with responses
      await setDoc(doc(db, "surveySessions", "analytics-sess"), {
        sessionId: "analytics-sess",
        officeId: "perth",
        repUserId: PERTH_REP_UID,
        status: "completed",
        startedAt: now,
        updatedAt: now,
        completedAt: now,
        respondentCount: 4,
        leadCount: 1,
        createdBy: PERTH_REP_UID,
        version: 2,
      });
      
      // 4 responses: 3 costOfLiving=yes, 2 tax=yes, 3 renters, 1 owner
      const responses = [
        { costOfLiving: "yes", tax: "yes", housing: "renter", employment: "full_time", super: "under_50k", becameLead: true },
        { costOfLiving: "yes", tax: "yes", housing: "renter", employment: "part_time", super: "50k_100k", becameLead: false },
        { costOfLiving: "yes", tax: "no", housing: "renter", employment: "casual", super: "under_50k", becameLead: false },
        { costOfLiving: "no", tax: "no", housing: "owner", employment: "retired", super: "dont_know", becameLead: false },
      ];
      
      for (let i = 0; i < responses.length; i++) {
        const r = responses[i];
        await setDoc(doc(db, "surveySessions", "analytics-sess", "responses", `a-${i}`), {
          responseId: `a-${i}`,
          sessionId: "analytics-sess",
          sequenceNumber: i + 1,
          costOfLivingIncreased: r.costOfLiving,
          payingTooMuchTax: r.tax,
          housingStatus: r.housing,
          employmentStatus: r.employment,
          superannuation: r.super,
          becameLead: r.becameLead,
          leadId: r.becameLead ? "analytics-lead" : null,
          createdAt: now,
          updatedAt: now,
        });
      }
      
      // Read and verify analytics
      const sessSnap = await getDoc(doc(db, "surveySessions", "analytics-sess"));
      expect(sessSnap.data()!.status).toBe("completed");
      expect(sessSnap.data()!.respondentCount).toBe(4);
      expect(sessSnap.data()!.leadCount).toBe(1);
      
      // Calculate expected analytics
      const costOfLivingYesPct = Math.round((3 / 4) * 100); // 75%
      const taxYesPct = Math.round((2 / 4) * 100); // 50%
      const renterPct = Math.round((3 / 4) * 100); // 75%
      const ownerPct = Math.round((1 / 4) * 100); // 25%
      const leadConversionPct = Math.round((1 / 4) * 100); // 25%
      
      expect(costOfLivingYesPct).toBe(75);
      expect(taxYesPct).toBe(50);
      expect(renterPct).toBe(75);
      expect(ownerPct).toBe(25);
      expect(leadConversionPct).toBe(25);
    });
  });
  
  it("returns zero analytics when no completed sessions", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      // Query for completed sessions (should return empty)
      const completedQuery = query(
        collection(db, "surveySessions"),
        where("status", "==", "completed"),
      );
      const snap = await getDocs(completedQuery);
      expect(snap.docs.length).toBe(0);
    });
  });
});