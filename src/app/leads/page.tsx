"use client";

import Link from "next/link";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LeadStatus, LeadSource } from "@/lib/types";
import { Search, Phone, Calendar, Plus, MoreHorizontal, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsSkeleton />}>
      <LeadsContent />
    </Suspense>
  );
}

function LeadsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 rounded bg-asg-border" />
      <div className="mt-6 h-10 rounded bg-asg-border" />
      <div className="mt-4 h-64 rounded bg-asg-border" />
    </div>
  );
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const { leads, currentUser, selectedOffice } = useApp();

  const initialView = searchParams.get("view");
  const initialStatus = searchParams.get("status");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">((initialStatus as LeadStatus) || "All");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "All">("All");
  const [repFilter, setRepFilter] = useState<string>(initialView === "my" ? currentUser.name : "All");
  const [sortBy, setSortBy] = useState<"createdAt" | "nextFollowUpAt" | "name">("createdAt");

  const statuses: LeadStatus[] = [
    "New", "No Answer", "Callback", "Contacted", "Interested", "Qualified", "Booked", "Revisit", "Not Interested", "Disqualified", "Wrong Number",
  ];
  const sources: LeadSource[] = ["Community Survey", "CSV Import", "Spreadsheet Import", "Marketing Campaign", "Manual Entry", "Referral"];

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (selectedOffice !== "All") {
      result = result.filter((l) => l.office === selectedOffice);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.mobile.includes(q) ||
          l.suburb.toLowerCase().includes(q) ||
          l.leadId.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "All") result = result.filter((l) => l.status === statusFilter);
    if (sourceFilter !== "All") result = result.filter((l) => l.source === sourceFilter);
    if (repFilter !== "All") result = result.filter((l) => l.assignedRep === repFilter);

    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "nextFollowUpAt") {
        const aDate = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : 0;
        const bDate = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : 0;
        return bDate - aDate;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [leads, selectedOffice, search, statusFilter, sourceFilter, repFilter, sortBy]);

  const uniqueReps = Array.from(new Set(leads.map((l) => l.assignedRep))).sort();

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Leads</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Manage and review all leads across your office.</p>
        </div>
        <Link href="/leads/new" className="asg-button-primary">
          <Plus className="h-4 w-4" />
          Add Lead
        </Link>
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
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as LeadSource | "All")} className="asg-select min-w-[160px]">
              <option value="All">All Sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="asg-select min-w-[140px]">
              <option value="All">All Reps</option>
              {uniqueReps.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="asg-select min-w-[140px]">
              <option value="createdAt">Newest First</option>
              <option value="nextFollowUpAt">Follow Up</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-asg-text-muted">{filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} found</p>

        {/* Desktop Table */}
        <div className="hidden overflow-hidden rounded-xl border border-asg-border bg-white shadow-sm lg:block">
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
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="group hover:bg-asg-cream/50">
                  <td>
                    <Link href={`/leads/${lead.id}`} className="font-medium text-asg-text hover:text-asg-gold-dark">
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
                  <td><StatusBadge status={lead.status} /></td>
                  <td className="text-sm text-asg-text-secondary">{lead.assignedRep}</td>
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
                    <Link href={`/leads/${lead.id}`} className="flex h-8 w-8 items-center justify-center rounded-md text-asg-text-muted hover:bg-asg-cream hover:text-asg-text">
                      <MoreHorizontal className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="px-6 py-12">
              <EmptyState
                icon={Search}
                title="No leads found"
                description="Try adjusting your filters or search terms to find what you're looking for."
              />
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 lg:hidden">
          {filteredLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="block rounded-xl border border-asg-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-asg-text">{lead.name}</p>
                  <p className="text-xs text-asg-text-muted">{lead.leadId}</p>
                </div>
                <StatusBadge status={lead.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-asg-text-secondary">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {lead.mobile}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {lead.assignedRep}
                </div>
                <div>{lead.suburb}</div>
                <div>{lead.source}</div>
              </div>
            </Link>
          ))}
          {filteredLeads.length === 0 && (
            <EmptyState
              icon={Search}
              title="No leads found"
              description="Try adjusting your filters or search terms."
            />
          )}
        </div>
      </div>
    </div>
  );
}
