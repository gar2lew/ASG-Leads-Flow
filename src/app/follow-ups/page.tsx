"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";
import { Phone, Calendar, CheckCircle2, Clock, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FollowUp } from "@/lib/types";

export default function FollowUpsPage() {
  const { followUps, currentUser, completeFollowUp } = useApp();
  const [repFilter, setRepFilter] = useState<string>("All");

  const reps = Array.from(new Set(followUps.map((f) => f.assignedRep))).sort();

  const filtered = useMemo(() => {
    let result = [...followUps];
    if (currentUser.role === "Rep") result = result.filter((f) => f.assignedRep === currentUser.name);
    if (repFilter !== "All") result = result.filter((f) => f.assignedRep === repFilter);
    return result.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [followUps, currentUser, repFilter]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const overdue = filtered.filter((f) => new Date(f.scheduledAt) < today && f.status !== "Completed");
  const dueToday = filtered.filter((f) => {
    const d = new Date(f.scheduledAt);
    return d >= today && d < tomorrow && f.status !== "Completed";
  });
  const dueTomorrow = filtered.filter((f) => {
    const d = new Date(f.scheduledAt);
    return d >= tomorrow && d < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) && f.status !== "Completed";
  });
  const upcoming = filtered.filter((f) => {
    const d = new Date(f.scheduledAt);
    return d >= new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) && f.status !== "Completed";
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Follow Ups</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Manage callbacks and scheduled follow-ups.</p>
        </div>
        {currentUser.role !== "Rep" && (
          <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="asg-select w-full lg:w-48">
            <option value="All">All Reps</option>
            {reps.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-6 space-y-8">
        <FollowUpSection title="Overdue" icon={AlertCircle} items={overdue} color="danger" completeFollowUp={completeFollowUp} />
        <FollowUpSection title="Today" icon={Clock} items={dueToday} color="warning" completeFollowUp={completeFollowUp} />
        <FollowUpSection title="Tomorrow" icon={Calendar} items={dueTomorrow} color="info" completeFollowUp={completeFollowUp} />
        <FollowUpSection title="Upcoming" icon={Calendar} items={upcoming} color="success" completeFollowUp={completeFollowUp} />
      </div>
    </div>
  );
}

function FollowUpSection({
  title,
  icon: Icon,
  items,
  color,
  completeFollowUp,
}: {
  title: string;
  icon: React.ElementType;
  items: FollowUp[];
  color: "danger" | "warning" | "info" | "success";
  completeFollowUp: (id: string) => void;
}) {
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
            <div key={fu.id} className={cn("rounded-xl border p-4 shadow-sm", colorStyles[color])}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-asg-text">{fu.leadName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-asg-text-secondary">
                    <User className="h-3.5 w-3.5" /> {fu.assignedRep}
                  </p>
                </div>
                <span className="text-xs font-medium text-asg-text-muted">{fu.office}</span>
              </div>
              <div className="mt-3 text-sm text-asg-text-secondary">
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(fu.scheduledAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="mt-1">Last result: <span className="font-medium text-asg-text">{fu.lastCallResult}</span></p>
                {fu.lastNote && <p className="mt-1 line-clamp-2 italic">"{fu.lastNote}"</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <a href={`tel:${fu.leadId ? "" : ""}`} className="asg-button-primary flex-1 text-xs py-2">
                  <Phone className="h-3.5 w-3.5" />
                  Call Now
                </a>
                <button onClick={() => completeFollowUp(fu.id)} className="asg-button-secondary px-3 py-2 text-xs">
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
