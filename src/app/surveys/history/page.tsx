// ============================================
// ASG Leads — Survey History Page Client Component
// ============================================
// Real Firestore-backed survey history

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/empty-state";
import { Calendar, User, Building2, Users, FileCheck, Clock, Search, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SurveySession {
  sessionId: string;
  officeId: string;
  repUserId: string;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  respondentCount: number;
  leadCount: number;
}

export default function SurveyHistoryPage() {
  const { profile, isRep, isManager, isAdmin } = useAuth();
  const [sessions, setSessions] = useState<SurveySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repFilter, setRepFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [officeFilter, setOfficeFilter] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 10;

  const fetchSessions = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize + 1));
      
      if (officeFilter !== "All") params.set("officeId", officeFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (repFilter !== "All") params.set("repUserId", repFilter);
      
      const res = await fetch(`/api/surveys?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch survey sessions");
      
      const data = await res.json();
      const fetchedSessions = data.sessions ?? [];
      
      const newHasMore = fetchedSessions.length > pageSize;
      const pageSessions = newHasMore ? fetchedSessions.slice(0, pageSize) : fetchedSessions;
      
      if (append) {
        setSessions((prev) => [...prev, ...pageSessions]);
      } else {
        setSessions(pageSessions);
      }
      setHasMore(newHasMore);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [officeFilter, statusFilter, repFilter, pageSize]);

  // Initial load and filter changes - use useEffect with empty deps pattern
  useEffect(() => {
    let cancelled = false;
    
    const load = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.set("limit", String(pageSize + 1));
        
        if (officeFilter !== "All") params.set("officeId", officeFilter);
        if (statusFilter !== "All") params.set("status", statusFilter);
        if (repFilter !== "All") params.set("repUserId", repFilter);
        
        const res = await fetch(`/api/surveys?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch survey sessions");
        
        if (cancelled) return;
        
        const data = await res.json();
        const fetchedSessions = data.sessions ?? [];
        
        const newHasMore = fetchedSessions.length > pageSize;
        const pageSessions = newHasMore ? fetchedSessions.slice(0, pageSize) : fetchedSessions;
        
        setSessions(pageSessions);
        setHasMore(newHasMore);
        setPage(1);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    load();
    return () => { cancelled = true; };
  }, [officeFilter, statusFilter, repFilter, pageSize]);

  // Determine available offices for filter
  const availableOffices = useMemo(() => {
    const offices = new Set<string>();
    sessions.forEach((s) => offices.add(s.officeId));
    return Array.from(offices).sort();
  }, [sessions]);

  // Get unique reps for filter
  const availableReps = useMemo(() => {
    const reps = new Set<string>();
    sessions.forEach((s) => {
      // We'd need to fetch rep names, for now use userId
      reps.add(s.repUserId);
    });
    return Array.from(reps).sort();
  }, [sessions]);

  const statusOptions = ["All", "completed", "in_progress", "draft", "cancelled"];

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <FileCheck className="h-3.5 w-3.5" />;
      case "in_progress":
        return <Clock className="h-3.5 w-3.5" />;
      case "draft":
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-asg-success";
      case "in_progress":
        return "text-asg-warning";
      case "draft":
        return "text-asg-info";
      default:
        return "text-asg-text-muted";
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="h-10 w-10 animate-spin text-asg-gold" />
        <p className="mt-4 text-asg-text-secondary">Loading survey history...</p>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-asg-danger-subtle">
          <AlertCircle className="h-7 w-7 text-asg-danger" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-asg-text">Survey History Error</h1>
        <p className="mt-2 text-sm text-asg-text-secondary">{error}</p>
        <button onClick={() => fetchSessions(1, false)} className="mt-4 asg-button-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Survey History</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Review previous Community Awareness Survey sessions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(isManager || isAdmin) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-asg-text-muted" />
              <select
                value={officeFilter}
                onChange={(e) => {
                  setOfficeFilter(e.target.value);
                  setPage(1);
                }}
                className="asg-select pl-10 min-w-[160px]"
              >
                <option value="All">All Offices</option>
                {availableOffices.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-asg-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="asg-select pl-10 min-w-[160px]"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-asg-text-muted" />
            <select
              value={repFilter}
              onChange={(e) => {
                setRepFilter(e.target.value);
                setPage(1);
              }}
              className="asg-select pl-10 min-w-[160px]"
            >
              <option value="All">All Reps</option>
              {availableReps.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <div key={session.sessionId} className="asg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-asg-text">{formatDate(session.startedAt)}</p>
                <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", getStatusColor(session.status))}>
                  {getStatusIcon(session.status)}
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1).replace("_", " ")}
                </p>
              </div>
              <span className="rounded-full bg-asg-gold-subtle px-2.5 py-1 text-xs font-medium text-asg-gold-dark">{session.officeId}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-asg-text-secondary">
              <p className="flex items-center gap-2"><User className="h-4 w-4 text-asg-gold" /> {session.repUserId}</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-asg-gold" /> {session.respondentCount} respondents</p>
              <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-asg-gold" /> {session.leadCount} leads captured</p>
            </div>
          </div>
        ))}

        {hasMore && (
          <div className="md:col-span-2 lg:col-span-3 flex justify-center">
            <button
              onClick={() => fetchSessions(page + 1, true)}
              disabled={loading}
              className="asg-button-secondary"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Load More
            </button>
          </div>
        )}
      </div>

      {sessions.length === 0 && !loading && (
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