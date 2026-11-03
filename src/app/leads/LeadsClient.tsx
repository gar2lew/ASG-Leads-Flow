// ============================================
// ASG Leads — Leads Page Client Component
// ============================================
// Fetches leads from server actions, maintains Astra UI

"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { KanbanBoard } from "@/components/kanban-board";
import { EmptyState } from "@/components/empty-state";
import { LeadStatus, LeadSource } from "@/lib/types";
import { Search, Phone, Calendar, Plus, MoreHorizontal, User, Loader2, AlertCircle, RefreshCw, LayoutList, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  leadId: string;
  name: string;
  mobile: string;
  address: string;
  suburb: string | null;
  officeId: string;
  assignedRepId: string | null;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  version: number;
  assignedRepName?: string;
}

interface LeadsClientProps {
  initialView?: string;
  initialStatus?: string;
}

const LEAD_STATUSES: LeadStatus[] = [
  "New", "No Answer", "Callback", "Contacted", "Interested", "Qualified", "Booked", "Revisit", "Not Interested", "Disqualified", "Wrong Number",
];

const LEAD_SOURCES: LeadSource[] = [
  "Community Survey", "CSV Import", "Spreadsheet Import", "Marketing Campaign", "Manual Entry", "Referral",
];

function LeadsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 rounded bg-asg-border" />
      <div className="mt-6 h-10 rounded bg-asg-border" />
      <div className="mt-4 h-64 rounded bg-asg-border" />
    </div>
  );
}

export function LeadsClient({ initialView, initialStatus }: LeadsClientProps) {
  const { profile, isRep, isManager, isAdmin } = useAuth();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">((initialStatus as LeadStatus) || "All");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "All">("All");
  const [repFilter, setRepFilter] = useState<string>(initialView === "my" ? profile?.displayName ?? "All" : "All");
  const [sortBy, setSortBy] = useState<"createdAt" | "nextFollowUpAt" | "name">("createdAt");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");

  // Kanban status change: POST to the status action, optimistic update on success
  const handleKanbanStatusChange = useCallback(async (leadId: string, newStatus: LeadStatus, expectedVersion: number): Promise<string | null> => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: newStatus.toLowerCase().replace(/ /g, "_"), expectedVersion }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409) return "This lead was just updated elsewhere — tap refresh and try again.";
      if (!response.ok) return (data as any).error?.message || "Failed to update lead status.";
      setLeads((prev) => prev.map((l) => (l.leadId === leadId ? { ...l, status: newStatus, version: expectedVersion + 1 } : l)));
      return null;
    } catch {
      return "Network error — check your connection and try again.";
    }
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async (append = false) => {
    if (append) setIsLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (sourceFilter !== "All") params.set("source", sourceFilter);
      if (repFilter !== "All") params.set("rep", repFilter);
      params.set("sort", sortBy);
      if (append && nextCursor) params.set("cursor", nextCursor);
      params.set("limit", "50");

      const response = await fetch(`/api/leads?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();

      // Fetch user profiles for assignedRepIds to get display names
      const assignedRepIds = [...new Set(data.leads.map((l: any) => l.assignedRepId).filter(Boolean))];
      let userProfilesMap = new Map<string, { displayName: string; email: string }>();
      if (assignedRepIds.length > 0) {
        const profilesResponse = await fetch(`/api/users/profiles?uids=${assignedRepIds.join(",")}`);
        if (profilesResponse.ok) {
          const profilesData = await profilesResponse.json();
          Object.entries(profilesData.profiles).forEach(([uid, profile]) => {
            userProfilesMap.set(uid, profile as { displayName: string; email: string });
          });
        }
      }

      const leadsWithNames = data.leads.map((lead: any) => ({
        ...lead,
        assignedRepName: userProfilesMap.get(lead.assignedRepId ?? "")?.displayName || null
      }));

      if (append) {
        setLeads((prev) => [...prev, ...leadsWithNames]);
      } else {
        setLeads(leadsWithNames);
      }
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [search, statusFilter, sourceFilter, repFilter, sortBy, nextCursor]);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeads();
  }, [fetchLeads]);

  // Get unique reps for filter dropdown
  const uniqueReps = useMemo(() => {
    const reps = new Set(leads.map((l) => l.assignedRepName).filter(Boolean));
    return Array.from(reps).sort();
  }, [leads]);

  if (loading && leads.length === 0) {
    return <LeadsSkeleton />;
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 text-asg-danger p-4 rounded-lg border border-asg-danger/30 bg-asg-danger-subtle">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load leads</p>
            <p className="text-sm text-asg-text-secondary">{error}</p>
            <button onClick={() => fetchLeads()} className="mt-2 asg-button-secondary">
              <RefreshCw className="h-4 w-4 mr-1" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Leads</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Manage and review all leads across your office.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-asg-border bg-white p-0.5">
            <button onClick={() => setView("list")} className={cn("flex min-h-[40px] items-center gap-1.5 rounded-md px-3 text-sm font-medium", view === "list" ? "bg-asg-cream text-asg-text" : "text-asg-text-secondary")}>
              <LayoutList className="h-4 w-4" /> List
            </button>
            <button onClick={() => setView("board")} className={cn("flex min-h-[40px] items-center gap-1.5 rounded-md px-3 text-sm font-medium", view === "board" ? "bg-asg-cream text-asg-text" : "text-asg-text-secondary")}>
              <Columns3 className="h-4 w-4" /> Board
            </button>
          </div>
          {(isManager || isAdmin) && (
            <Link href="/leads/new" className="asg-button-primary">
              <Plus className="h-4 w-4" />
              Add Lead
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-asg-text-muted" />
            <input
              type="text"
              placeholder="Search by name, phone, suburb or lead ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="asg-input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "All")} className="asg-select min-w-[140px]">
              <option value="All">All Statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as LeadSource | "All")} className="asg-select min-w-[160px]">
              <option value="All">All Sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {(!isRep || isManager || isAdmin) && (
              <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="asg-select min-w-[140px]">
                <option value="All">All Reps</option>
                {uniqueReps.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="asg-select min-w-[140px]">
              <option value="createdAt">Newest First</option>
              <option value="nextFollowUpAt">Follow Up</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-asg-text-muted">
          {totalCount} lead{totalCount !== 1 ? "s" : ""} found{hasMore ? " (showing first page)" : ""}
        </p>

        {/* Desktop Table */}
        <div className={cn("hidden overflow-hidden rounded-xl border border-asg-border bg-white shadow-sm lg:block", view !== "list" && "hidden")}>
          <table className="asg-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th>Rep</th>
                <th>Source</th>
                <th>Follow Up</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.leadId} className="group hover:bg-asg-cream/50">
                  <td>
                    <Link href={`/leads/${lead.leadId}`} className="font-medium text-asg-text hover:text-asg-gold-dark">
                      {lead.name}
                    </Link>
                    <p className="text-xs text-asg-text-muted">{lead.leadId}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-sm text-asg-text-secondary">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.mobile}
                    </div>
                  </td>
                  <td className="text-sm text-asg-text-secondary">{lead.suburb}</td>
                  <td><StatusBadge status={lead.status as LeadStatus} /></td>
                  <td className="text-sm text-asg-text-secondary">{lead.assignedRepName ?? "—"}</td>
                  <td className="text-sm text-asg-text-secondary">{lead.source}</td>
                  <td>
                    {lead.nextFollowUpAt ? (
                      <div className="flex items-center gap-1.5 text-sm text-asg-text-secondary">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(lead.nextFollowUpAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </div>
                    ) : (
                      <span className="text-sm text-asg-text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/leads/${lead.leadId}`} className="flex h-8 w-8 items-center justify-center rounded-md text-asg-text-muted hover:bg-asg-cream hover:text-asg-text">
                      <MoreHorizontal className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && (
            <div className="px-6 py-12">
              <EmptyState
                icon={Search}
                title="No leads found"
                description="Try adjusting your filters or search terms to find what you're looking for."
              />
            </div>
          )}
          {hasMore && (
            <div className="px-6 py-4 text-center border-t border-asg-border">
              <button
                onClick={() => fetchLeads(true)}
                disabled={isLoadingMore}
                className="asg-button-secondary"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}
        </div>

        {/* Kanban Board (tablet drag / phone accordion) */}
        {view === "board" && (
          <KanbanBoard
            leads={leads}
            onStatusChange={handleKanbanStatusChange}
            totalUnmatched={hasMore ? Math.max(0, totalCount - leads.length) : 0}
          />
        )}

        {/* Mobile Cards — swipe left to reveal Call / View */}
        <div className={cn("space-y-3 lg:hidden", view !== "list" && "hidden")}>
          {leads.map((lead) => (
            <SwipeableLeadCard key={lead.leadId} lead={lead} />
          ))}
          {leads.length === 0 && (
            <EmptyState
              icon={Search}
              title="No leads found"
              description="Try adjusting your filters or search terms."
            />
          )}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={() => fetchLeads(true)}
                disabled={isLoadingMore}
                className="asg-button-secondary"
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Swipeable mobile lead card: swipe left reveals Call / View actions (touch-first, no drag-drop needed)
function SwipeableLeadCard({ lead }: { lead: Lead }) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const lockedAxis = useRef<"none" | "x" | "y">("none");
  const [isDraggingX, setIsDraggingX] = useState(false);

  const MAX = 168; // px reveal width

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    lockedAxis.current = "none";
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (lockedAxis.current === "none") {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    }
    if (lockedAxis.current !== "x") return;
    setIsDraggingX(true);
    const base = open ? -MAX : 0;
    setOffset(Math.min(0, Math.max(-MAX, base + dx)));
  };

  const onTouchEnd = () => {
    setIsDraggingX(false);
    const revealed = offset < -MAX / 2;
    setOpen(revealed);
    setOffset(revealed ? -MAX : 0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl lg:hidden">
      {/* Revealed actions behind the card */}
      <div className="absolute inset-y-0 right-0 flex items-stretch gap-1 p-1">
        <a
          href={`tel:${lead.mobile.replace(/\s/g, "")}`}
          className="flex w-20 flex-col items-center justify-center gap-1 rounded-lg bg-asg-gold text-[11px] font-semibold text-asg-navy"
        >
          <Phone className="h-5 w-5" />
          Call
        </a>
        <Link
          href={`/leads/${lead.leadId}`}
          className="flex w-20 flex-col items-center justify-center gap-1 rounded-lg bg-asg-navy text-[11px] font-semibold text-white"
        >
          <User className="h-5 w-5" />
          View
        </Link>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${offset}px)`, transition: isDraggingX ? "none" : "transform 200ms ease" }}
        className="relative touch-pan-y rounded-xl border border-asg-border bg-white p-4 shadow-sm"
      >
        <Link href={`/leads/${lead.leadId}`} className="block">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-asg-text">{lead.name}</p>
              <p className="text-xs text-asg-text-muted">{lead.leadId}</p>
            </div>
            <StatusBadge status={lead.status as LeadStatus} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-asg-text-secondary">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {lead.mobile}
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {lead.assignedRepName ?? "—"}
            </div>
            <div>{lead.suburb}</div>
            <div>{lead.source}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}