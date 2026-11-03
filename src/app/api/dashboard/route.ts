// ============================================
// ASG Leads — Dashboard API Route
// ============================================
// Returns real metrics from Firestore via getDashboardMetrics()

import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics, getLeadsForUser, getUserProfiles, getFollowUpsForUser } from "@/lib/server/leads";
import { getAdminFirestore, isAdminConfigured } from "@/lib/firebase/admin";
const COLLECTIONS = { LEADS: "leads" };

export async function GET(request: NextRequest) {
  try {
    const [metrics, recentLeadsResult] = await Promise.all([
      getDashboardMetrics(),
      getLeadsForUser({ limit: 12 }),
    ]);

    // Resolve rep display names for recent leads
    const repIds = recentLeadsResult.leads
      .map((l) => l.assignedRepId)
      .filter((id): id is string => Boolean(id));
    const repNames = await getUserProfiles(repIds);

    const recentLeads = recentLeadsResult.leads.map((l) => ({
      leadId: l.leadId,
      name: l.name,
      status: l.status,
      mobile: l.mobile,
      suburb: l.suburb,
      officeId: l.officeId,
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
      assignedRepId: l.assignedRepId,
      assignedRepName: l.assignedRepId ? repNames.get(l.assignedRepId)?.displayName ?? null : null,
    }));

    // Real pending follow-ups (ordered by scheduledAt), with lead + rep names resolved
    const followUps = isAdminConfigured() ? await getFollowUpsForUser({ status: "pending", limit: 5 }) : [];
    const uniqueLeadIds = [...new Set(followUps.map((fu: any) => fu.leadId).filter(Boolean))];

    const db = getAdminFirestore();
    const leadNameMap = new Map<string, string>();
    await Promise.all(
      uniqueLeadIds.map(async (leadDocId: string) => {
        try {
          const snap = await db.collection(COLLECTIONS.LEADS).doc(leadDocId).get();
          if (snap.exists) {
            const data = snap.data() as Record<string, any>;
            leadNameMap.set(leadDocId, data.name ?? leadDocId);
          }
        } catch {
          // Leave unsubstituted on lookup failure
        }
      })
    );

    const allFollowUpRepIds = followUps.map((fu: any) => fu.assignedRepId).filter(Boolean);
    const followUpRepNames = await getUserProfiles(allFollowUpRepIds as string[]);

    const upcomingCallbacks = (followUps as any[]).map((fu) => ({
      followUpId: fu.followUpId,
      leadId: fu.leadId,
      leadName: leadNameMap.get(fu.leadId) ?? null,
      officeId: fu.officeId,
      assignedRepId: fu.assignedRepId ?? null,
      assignedRepName: fu.assignedRepId ? followUpRepNames.get(fu.assignedRepId)?.displayName ?? null : null,
      scheduledAt: fu.scheduledAt,
      status: fu.status,
      reason: fu.reason ?? null,
      lastNote: fu.lastNote ?? null,
    }));

    return NextResponse.json({
      metrics: {
        myLeads: metrics.myLeads,
        leadsToCall: metrics.leadsToCall,
        followUpsDue: metrics.followUpsDue,
        newLeads: metrics.newLeads,
        bookedLeads: metrics.bookedLeads,
        officeLeadCounts: metrics.officeLeadCounts,
      },
      recentLeads,
      upcomingCallbacks,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

