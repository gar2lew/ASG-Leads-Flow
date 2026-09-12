// ============================================
// ASG Leads — Follow-Ups Page Client Component
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Phone, Calendar, CheckCircle2, Clock, User, AlertCircle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatZonedTime, startOfDayInTimeZone, officeToTimeZone } from "@/lib/timezone";

interface FollowUp {
  followUpId: string;
  leadId: string;
  officeId: string;
  assignedRepId: string;
  scheduledAt: string; // ISO string in UTC
  status: string;
  reason?: string | null;
  lastCallResult?: string | null;
  lastNote?: string | null;
  createdAt: string;
  createdBy: string;
  completedAt?: string | null;
  completedBy?: string | null;
  leadName?: string;
  assignedRepName?: string;
}

interface FollowUpSectionProps {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: FollowUp[];
  color: "danger" | "warning" | "info" | "success";
  onCompleteFollowUp: (id: string) => Promise<void>;
  timeZone: string;
}

export default function FollowUpsPage() {
  const { profile, isRep, isManager, isAdmin } = useAuth();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repFilter, setRepFilter] = useState<string>("All");
  const [officeFilter, setOfficeFilter] = useState<string>("All");

  // Get user's primary office from profile (if rep) or use filter
  const userOffice = profile?.primaryOfficeId;

  // Fetch follow-ups from API
  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (repFilter !== "All") params.set("rep", repFilter);
      if (officeFilter !== "All") params.set("office", officeFilter);
      const response = await fetch(`/api/follow-ups?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch follow-ups");
      const data = await response.json();
      setFollowUps(data.followUps || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [repFilter, officeFilter]);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handleCompleteFollowUp = async (id: string) => {
    try {
      const response = await fetch(`/api/follow-ups/${id}/complete`, { method: "POST" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to complete follow-up");
      }
      // Refetch after completion
      fetchFollowUps();
    } catch (err: any) {
      alert(err.message || "Failed to complete follow-up");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="h-10 w-10 animate-spin text-asg-gold" />
        <p className="mt-4 text-asg-text-secondary">Loading follow-ups...</p>
      </div>
    );
  }

  if (error && followUps.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-asg-danger-subtle">
          <AlertCircle className="h-7 w-7 text-asg-danger" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-asg-text">Follow-Ups Error</h1>
        <p className="mt-2 text-sm text-asg-text-secondary">{error}</p>
        <button onClick={fetchFollowUps} className="mt-4 asg-button-primary">Retry</button>
      </div>
    );
  }

  // Determine timezone for display: use follow-up's office if rep, otherwise use filtered office
  const displayOffice = isRep && userOffice ? userOffice : officeFilter !== "All" ? officeFilter : "perth";
  const timeZone = officeToTimeZone(displayOffice);

  const now = new Date();
  const todayStart = startOfDayInTimeZone(now.toISOString(), timeZone);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // Filter and sort follow-ups
  const filtered = followUps
    .filter((fu) => {
      // Apply rep filter for non-reps (reps see their own by API, but we double-check)
      if (!isRep && repFilter !== "All" && fu.assignedRepId !== repFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const overdue = filtered.filter((fu) => {
    const scheduled = new Date(fu.scheduledAt);
    return scheduled < todayStart && fu.status !== "completed";
  });
  const dueToday = filtered.filter((fu) => {
    const scheduled = new Date(fu.scheduledAt);
    return scheduled >= todayStart && scheduled < tomorrowStart && fu.status !== "completed";
  });
  const dueTomorrow = filtered.filter((fu) => {
    const scheduled = new Date(fu.scheduledAt);
    return scheduled >= tomorrowStart && scheduled < new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000) && fu.status !== "completed";
  });
  const upcoming = filtered.filter((fu) => {
    const scheduled = new Date(fu.scheduledAt);
    return scheduled >= new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000) && fu.status !== "completed";
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Follow Ups</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Manage callbacks and scheduled follow-ups.</p>
        </div>
        {(isManager || isAdmin) && (
          <>
            <div className="relative flex-1">
              <User className="absolute left-3 top-3 h-4 w-4 text-asg-text-muted" />
              <input
                type="text"
                placeholder="Filter by rep name..."
                value={repFilter}
                onChange={(e) => setRepFilter(e.target.value)}
                className="asg-input pl-10"
              />
            </div>
            <div className="relative flex-1 mt-4 lg:mt-0">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-asg-text-muted" />
              <select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value)}
                className="asg-select min-w-[140px]"
              >
                <option value="All">All Offices</option>
                <option value="perth">Perth</option>
                <option value="brisbane">Brisbane</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 space-y-8">
        <FollowUpSection
          title="Overdue"
          icon={AlertCircle}
          items={overdue}
          color="danger"
          onCompleteFollowUp={handleCompleteFollowUp}
          timeZone={timeZone}
        />
        <FollowUpSection
          title="Today"
          icon={Clock}
          items={dueToday}
          color="warning"
          onCompleteFollowUp={handleCompleteFollowUp}
          timeZone={timeZone}
        />
        <FollowUpSection
          title="Tomorrow"
          icon={Calendar}
          items={dueTomorrow}
          color="info"
          onCompleteFollowUp={handleCompleteFollowUp}
          timeZone={timeZone}
        />
        <FollowUpSection
          title="Upcoming"
          icon={Calendar}
          items={upcoming}
          color="success"
          onCompleteFollowUp={handleCompleteFollowUp}
          timeZone={timeZone}
        />
      </div>
    </div>
  );
}

function FollowUpSection({
  title,
  icon: Icon,
  items,
  color,
  onCompleteFollowUp,
  timeZone,
}: FollowUpSectionProps) {
  const colorStyles = {
    danger: "border-asg-danger/30 bg-asg-danger-subtle",
    warning: "border-asg-warning/30 bg-asg-warning-subtle",
    info: "border-asg-info/30 bg-asg-info-subtle",
    success: "border-asg-success/30 bg-asg-success-subtle",
  };

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("h-5 w-5", color === "danger" ? "text-asg-danger" : color === "warning" ? "text-asg-warning" : color === "info" ? "text-asg-info" : "text-asg-success")} />
        <h2 className="text-lg font-semibold text-asg-text">{title}</h2>
        <span className="ml-2 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-asg-text-secondary border border-asg-border">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-asg-border-strong bg-asg-cream px-5 py-6 text-sm text-asg-text-secondary">
          No follow-ups {title.toLowerCase()}.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((fu) => (
            <div key={fu.followUpId} className={cn("rounded-xl border p-4 shadow-sm", colorStyles[color])}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-asg-text">{fu.leadName || fu.leadId}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-asg-text-secondary">
                    <User className="h-3.5 w-3.5" />
                    {fu.assignedRepName || fu.assignedRepId}
                  </p>
                </div>
                <span className="text-xs font-medium text-asg-text-muted">{fu.officeId}</span>
              </div>
              <div className="mt-3 text-sm text-asg-text-secondary">
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatZonedTime(new Date(fu.scheduledAt), timeZone, {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="mt-1">
                Last result: <span className="font-medium text-asg-text">{fu.lastCallResult || "—"}</span>
              </p>
              {fu.lastNote && <p className="mt-1 line-clamp-2 italic">&ldquo;{fu.lastNote}&rdquo;</p>}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onCompleteFollowUp(fu.followUpId)}
                  className="asg-button-primary flex-1 text-xs py-2"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}