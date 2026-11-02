// ============================================
// ASG Leads — Overdue Follow-Ups API Route
// ============================================
// Returns pending follow-ups whose scheduledAt is in the past (or today).

import { NextResponse } from "next/server";
import { getFollowUpsForUser } from "@/lib/server/leads";
import { isAdminConfigured } from "@/lib/firebase/admin";

export async function GET() {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json({ overdue: [] });
    }

    const pending = await getFollowUpsForUser({ status: "pending", limit: 100 });
    const now = new Date();

    const overdue = (pending as any[])
      .map((fu) => {
        const raw = fu.scheduledAt;
        const date =
          raw instanceof Date
            ? raw
            : typeof raw === "object" && raw !== null && typeof (raw as any).toDate === "function"
              ? (raw as any).toDate()
              : new Date(raw);
        return { ...fu, scheduledAtIso: isNaN(date.getTime()) ? null : date.toISOString() };
      })
      .filter((fu) => fu.scheduledAtIso && new Date(fu.scheduledAtIso).getTime() <= now.getTime());

    return NextResponse.json({ overdue });
  } catch (error: any) {
    console.error("Overdue follow-ups API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch overdue follow-ups" },
      { status: 500 }
    );
  }
}
