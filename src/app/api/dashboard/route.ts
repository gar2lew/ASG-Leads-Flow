// ============================================
// ASG Leads — Dashboard API Route
// ============================================
// Returns real metrics from Firestore via getDashboardMetrics()

import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/server/leads";
import { getLeadsForUser } from "@/lib/server/leads";

export async function GET(request: NextRequest) {
  try {
    const [metrics, recentLeadsResult] = await Promise.all([
      getDashboardMetrics(),
      getLeadsForUser({ limit: 5 }),
    ]);

    return NextResponse.json({
      metrics: {
        myLeads: metrics.myLeads,
        leadsToCall: metrics.leadsToCall,
        followUpsDue: metrics.followUpsDue,
        newLeads: metrics.newLeads,
        bookedLeads: metrics.bookedLeads,
        officeLeadCounts: metrics.officeLeadCounts,
      },
      recentLeads: recentLeadsResult.leads.map((l) => ({
        leadId: l.leadId,
        name: l.name,
        status: l.status,
        officeId: l.officeId,
        createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
        assignedRepId: l.assignedRepId,
      })),
      upcomingCallbacks: [],
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}