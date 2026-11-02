// Seeds realistic demo leads into Firestore.
// Usage: npm run seed:leads   (or npx tsx --import ./scripts/shims/server-only-neutralize.mjs scripts/seed-demo-leads.ts)
import "dotenv/config";

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { normalizeAustralianMobile } from "../src/lib/domain/mobile";
import { COLLECTIONS } from "../src/lib/firebase/collections";

const SEED = [
  // name, mobile, suburb, office, source, status
  { name: "Sarah Mitchell", mobile: "0401 234 501", suburb: "Joondalup", office: "perth", source: "community_survey", status: "new", notes: "Met at Kingsway Shopping Centre survey stand, keen on solar assessment." },
  { name: "David Nguyen", mobile: "0412 345 602", suburb: "Morley", office: "perth", source: "spreadsheet_import", status: "no_answer", notes: "Line rang out twice." },
  { name: "Priya Sharma", mobile: "0423 456 703", suburb: "Canning Vale", office: "perth", source: "referral", status: "callback", notes: "Asked to call back Tuesday evening after 6pm." },
  { name: "Tom Robinson", mobile: "0434 567 804", suburb: "Fremantle", office: "perth", source: "manual_entry", status: "interested", notes: "Wants battery backup quote for 6kW system." },
  { name: "Elena Kowalski", mobile: "0445 678 905", suburb: "Rockingham", office: "perth", source: "csv_import", status: "booked", notes: "Site inspection booked." },
  { name: "Jack Thompson", mobile: "0456 789 106", suburb: " Ellenbrook", office: "perth", source: "marketing_campaign", status: "revisit", notes: "Reconsidering after partner talk." },
  { name: "Chloe Anderson", mobile: "0467 890 207", suburb: "Perth CBD", office: "perth", source: "community_survey", status: "not_interested", notes: "Renting, landlord decision." },
  { name: "Wei Zhang", mobile: "0478 901 308", suburb: "Indooroopilly", office: "brisbane", source: "community_survey", status: "new", notes: "New build, interested in EV charger + solar." },
  { name: "Marcus Bell", mobile: "0489 012 409", suburb: "Chermside", office: "brisbane", source: "spreadsheet_import", status: "no_answer", notes: "" },
  { name: "Isabella Costa", mobile: "0490 123 510", suburb: "Carindale", office: "brisbane", source: "referral", status: "contacted", notes: "Spouse handles finances, call back fortnight." },
  { name: "Liam O'Connor", mobile: "0402 234 611", suburb: "Ipswich", office: "brisbane", source: "csv_import", status: "interested", notes: "Older 5kW system, wants expansion quote." },
  { name: "Harmony Dube", mobile: "0413 345 712", suburb: "Sunnybank", office: "brisbane", source: "manual_entry", status: "qualified", notes: "Qualified; budget confirmed, roof suitable." },
  { name: "Ryan Fitzgerald", mobile: "0424 456 813", suburb: "North Lakes", office: "brisbane", source: "marketing_campaign", status: "wrong_number", notes: "Number disconnected." },
  { name: "Amelia Hart", mobile: "0435 567 914", suburb: "Bayswater", office: "perth", source: "community_survey", status: "new", notes: "" },
];

const FOLLOW_UP_FOR: Record<string, { days: number; reason: string; result?: string; note?: string }> = {
  3: { days: 2, reason: "Requested Tuesday evening callback", result: "callback", note: "Callback 6pm+ Tue" },
  4: { days: 3, reason: "Confirm battery quote timing", result: "interested" },
  6: { days: 7, reason: "Revisit after partner discussion", result: "revisit" },
  10: { days: 14, reason: "Call back fortnight", result: "callback" },
  9: { days: 1, reason: "Second attempt after no answer", result: "no_answer" },
};

// IDs are filled in below by matching sub-extract on name for readability,
// but follow-ups reference by index via FB keys.
async function main() {
  if (getApps().length === 0) {
    initializeApp({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "amplify-leads-2026" });
  }
  const auth = getAuth();
  const db = getFirestore();

  const { users } = await auth.listUsers(100);
  const uidByEmail = new Map(users.map((u) => [u.email, u.uid]));
  const adminUid = uidByEmail.get("admin@example.test") ?? "system";
  const repUids = {
    perth: uidByEmail.get("rep.perth@example.test"),
    brisbane: uidByEmail.get("rep.brisbane@example.test"),
  };
  if (!repUids.perth || !repUids.brisbane) {
    throw new Error("Seed the dev users first: npm run seed");
  }

  const existing = await db.collection(COLLECTIONS.LEADS).limit(1).get();
  if (!existing.empty) {
    console.log(`Leads collection already has documents — skipping demo seed.`);
    return;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (let i = 0; i < SEED.length; i++) {
    const s = SEED[i];
    const leadId = crypto.randomUUID();
    const rep = repUids[s.office as "perth" | "brisbane"]!;
    const mobileNormalized = normalizeAustralianMobile(s.mobile) ?? s.mobile;

    const createdAt = new Date(now - (SEED.length - i) * (6 * day / 5));
    const touched = i in FOLLOW_UP_FOR;
    const lastContactAt = s.status === "new" ? null : new Date(createdAt.getTime() + day);

    await db.collection(COLLECTIONS.LEADS).doc(leadId).set({
      leadId,
      name: s.name,
      mobile: s.mobile,
      mobileNormalized,
      address: `${10 + i} Example Street`,
      suburb: s.suburb.trim(),
      officeId: s.office,
      assignedRepId: rep,
      source: s.source,
      status: s.status,
      notes: s.notes || null,
      survey: null,
      createdAt,
      createdBy: adminUid,
      updatedAt: touched || lastContactAt ? (lastContactAt ?? createdAt) : createdAt,
      updatedBy: touched || lastContactAt ? rep : adminUid,
      lastContactAt,
      nextFollowUpAt: FOLLOW_UP_FOR[i] ? new Date(now + FOLLOW_UP_FOR[i].days * day) : null,
      activeCallLease: null,
      archivedAt: null,
      version: touched ? 2 : 1,
    });
    await db.collection(COLLECTIONS.LEAD_MOBILE_KEYS).doc(mobileNormalized).set({
      leadId,
      officeId: s.office,
      createdAt,
    });

    // Creation activity for every lead
    await db.collection(COLLECTIONS.LEADS).doc(leadId).collection("activities").add({
      activityId: crypto.randomUUID(),
      leadId,
      type: s.source.includes("import") ? "lead_imported" : "lead_created",
      description: `Lead created via ${s.source.replace(/_/g, " ")}`,
      createdAt,
      createdBy: adminUid,
      metadata: { source: s.source },
    });

    // Call/response activity for leads that have been worked
    if (touched && lastContactAt) {
      await db.collection(COLLECTIONS.LEADS).doc(leadId).collection("activities").add({
        activityId: crypto.randomUUID(),
        leadId,
        type: "call_completed",
        description: `Call completed — result: ${(FOLLOW_UP_FOR[i]?.result ?? s.status).replace(/_/g, " ")}`,
        createdAt: lastContactAt,
        createdBy: rep,
        metadata: { result: FOLLOW_UP_FOR[i]?.result ?? s.status },
      });
    }

    // Pending follow-up records
    if (FOLLOW_UP_FOR[i]) {
      const f = FOLLOW_UP_FOR[i];
      const rep2 = rep;
      await db.collection(COLLECTIONS.FOLLOW_UPS).add({
        followUpId: crypto.randomUUID(),
        leadId,
        officeId: s.office,
        assignedRepId: rep2,
        scheduledAt: new Date(now + f.days * day),
        status: "pending",
        reason: f.reason,
        lastCallResult: f.result ?? null,
        lastNote: f.note ?? null,
        createdAt: lastContactAt ?? createdAt,
        createdBy: rep2,
        completedAt: null,
        completedBy: null,
      });
    }
  }

  console.log(`Seeded ${SEED.length} demo leads with activities and follow-ups.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
