import Link from "next/link";
import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { MetricCard } from "@/components/metric-card";

interface ExecutiveSnapshotProps {
  metrics: {
    totalLeads: number;
    bookedLeads: number;
    followUpsDue: number;
    newLeads: number;
  };
  callbacks: Array<{
    followUpId: string;
    leadId: string;
    scheduledAt: string;
    leadName?: string | null;
    assignedRepName?: string | null;
  }>;
}

export function ExecutiveSnapshot({ metrics, callbacks }: ExecutiveSnapshotProps) {
  return (
    <section aria-label="Executive summary" className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard icon={Users} label="Total Leads" value={metrics.totalLeads} accent="navy" className="p-4 lg:p-5" />
        <MetricCard icon={Calendar} label="Bookings This Week" value={metrics.bookedLeads} accent="gold" className="p-4 lg:p-5" />
        <MetricCard icon={Clock} label="Follow Ups Due" value={metrics.followUpsDue} accent="gold" className="p-4 lg:p-5" />
        <MetricCard icon={TrendingUp} label="New Leads" value={metrics.newLeads} accent="success" className="p-4 lg:p-5" />
      </div>

      <div className="asg-card min-w-0">
        <div className="flex items-center justify-between border-b border-asg-border px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-asg-text-muted">Next actions</p>
            <h2 className="mt-1 font-semibold text-asg-text">Calls due</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-asg-warning/15 px-2.5 py-1 text-sm font-semibold text-asg-text-secondary">
              {callbacks.length}
            </span>
            <Link href="/follow-ups" className="flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-asg-gold-dark hover:bg-asg-cream">
              All <span className="sr-only">follow-ups</span>
            </Link>
          </div>
        </div>
        <div className="divide-y divide-asg-border">
          {callbacks.length === 0 ? (
            <p className="px-5 py-6 text-sm text-asg-text-secondary">No calls scheduled.</p>
          ) : (
            callbacks.slice(0, 3).map((callback) => (
              <Link
                key={callback.followUpId}
                href={`/leads/${callback.leadId}`}
                className="flex min-h-[64px] items-center justify-between gap-3 px-5 py-3 hover:bg-asg-cream/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-asg-text">{callback.leadName ?? callback.leadId}</p>
                  <p className="truncate text-sm text-asg-text-secondary">
                    {new Date(callback.scheduledAt).toLocaleString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {callback.assignedRepName ? ` · ${callback.assignedRepName}` : ""}
                  </p>
                </div>
                <Clock className="h-4 w-4 shrink-0 text-asg-gold-dark" />
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
