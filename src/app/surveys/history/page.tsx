"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { Calendar, User, Building2, Users, FileCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SurveyHistoryPage() {
  const { surveySessions, currentUser, selectedOffice } = useApp();
  const [repFilter, setRepFilter] = useState("All");

  const reps = Array.from(new Set(surveySessions.map((s) => s.rep))).sort();

  const filtered = useMemo(() => {
    let result = [...surveySessions];
    if (selectedOffice !== "All") result = result.filter((s) => s.office === selectedOffice);
    if (currentUser.role === "Rep") result = result.filter((s) => s.rep === currentUser.name);
    if (repFilter !== "All") result = result.filter((s) => s.rep === repFilter);
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [surveySessions, selectedOffice, currentUser, repFilter]);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Survey History</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Review previous Community Awareness Survey sessions.</p>
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

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((session) => (
          <div key={session.id} className="asg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-asg-text">{new Date(session.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
                <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", session.status === "Submitted" ? "text-asg-success" : "text-asg-warning")}>
                  {session.status === "Submitted" ? <FileCheck className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {session.status}
                </p>
              </div>
              <span className="rounded-full bg-asg-gold-subtle px-2.5 py-1 text-xs font-medium text-asg-gold-dark">{session.office}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-asg-text-secondary">
              <p className="flex items-center gap-2"><User className="h-4 w-4 text-asg-gold" /> {session.rep}</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-asg-gold" /> {session.respondents} respondents</p>
              <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-asg-gold" /> {session.leadsCaptured} leads captured</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={Calendar}
            title="No survey history"
            description="Survey sessions will appear here once they are submitted."
          />
        </div>
      )}
    </div>
  );
}

