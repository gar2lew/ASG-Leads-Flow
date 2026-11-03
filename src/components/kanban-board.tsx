"use client";

// ============================================
// ASG Leads — Touch-first Pipeline Kanban Board
// ============================================
// Tablet/desktop: horizontal columns with pointer-based drag & drop
// (pointer events, so it works on iPad touch AND desktop mouse).
// Phones (< md): accordion per column — tappable, scrollable, no drag.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown, Phone, Loader2, AlertCircle } from "lucide-react";

interface KanbanLead {
  leadId: string;
  name: string;
  mobile: string;
  suburb: string | null;
  status: string;
  assignedRepName?: string | null;
  version: number;
}

const BOARD_COLUMNS: LeadStatus[] = [
  "New",
  "No Answer",
  "Callback",
  "Contacted",
  "Interested",
  "Qualified",
  "Booked",
  "Revisit",
  "Not Interested",
  "Disqualified",
  "Wrong Number",
];

// Canonicalize a raw status value ("wrong_number", "no answer", "NEW") to a
// canonical status matching a board column key.
function canonicalStatus(raw: string): LeadStatus | null {
  const norm = raw.trim().toLowerCase().replace(/_/g, " ");
  return BOARD_COLUMNS.find((col) => col.toLowerCase() === norm) ?? null;
}

const COLUMN_ACCENTS: Record<string, string> = {
  New: "border-asg-border",
  "No Answer": "border-asg-warning/40",
  Callback: "border-asg-gold/40",
  Contacted: "border-blue-300",
  Interested: "border-asg-success/40",
  Qualified: "border-asg-success/60",
  Booked: "border-asg-gold",
  Revisit: "border-asg-border",
  "Not Interested": "border-asg-danger/30",
  Disqualified: "border-asg-danger/40",
  "Wrong Number": "border-asg-border",
};

interface KanbanBoardProps {
  leads: KanbanLead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus, expectedVersion: number) => Promise<string | null>;
  totalUnmatched?: number;
}

export function KanbanBoard({ leads, onStatusChange, totalUnmatched }: KanbanBoardProps) {
  const [dragLead, setDragLead] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [savingLead, setSavingLead] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Map<string, LeadStatus>>(new Map());
  // Phone accordion: first column expanded by default
  const [openColumns, setOpenColumns] = useState<Set<string>>(() => new Set(["New", "Interested"]));

  const dragInfo = useRef<{ startX: number; startY: number; active: boolean } | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<string, KanbanLead[]>();
    for (const col of BOARD_COLUMNS) map.set(col, []);
    for (const lead of leads) {
      const status = optimisticStatus.get(lead.leadId) ?? canonicalStatus(lead.status) ?? "New";
      const bucket = map.get(status);
      if (bucket) bucket.push(lead);
      else map.set(status, [lead]);
    }
    return map;
  }, [leads, optimisticStatus]);

  const commitStatus = async (leadId: string, newStatus: LeadStatus, expectedVersion: number) => {
    setOptimisticStatus((prev) => new Map(prev).set(leadId, newStatus));
    setSavingLead(leadId);
    setError(null);
    const err = await onStatusChange(leadId, newStatus, expectedVersion);
    setSavingLead(null);
    setOptimisticStatus((prev) => {
      const next = new Map(prev);
      next.delete(leadId);
      return next;
    });
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 6000);
    }
  };

  // --- Pointer-based drag (works on iPad touch and desktop) ---
  // Latest values for the drag listeners are mirrored into refs inside
  // an effect (never during render) so the closures always see fresh data.
  const leadMetaRef = useRef<Map<string, { version: number; status: string }>>(new Map());
  const optimisticRef = useRef<Map<string, LeadStatus>>(new Map());
  const overColumnRef = useRef<string | null>(null);

  useEffect(() => {
    leadMetaRef.current = new Map(leads.map((l) => [l.leadId, { version: l.version, status: canonicalStatus(l.status) ?? "New" }]));
    optimisticRef.current = optimisticStatus;
  });

  useEffect(() => {
    overColumnRef.current = overColumn;
  }, [overColumn]);

  const onCardPointerDown = (leadId: string) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    const info = { startX: e.clientX, startY: e.clientY, active: false, pointerId: e.pointerId };
    const onMove = (evt: PointerEvent) => {
      if (info.active) {
        evt.preventDefault();
        const el = document.elementFromPoint(evt.clientX, evt.clientY) as HTMLElement | null;
        const col = el?.closest("[data-column]")?.getAttribute("data-column") ?? null;
        overColumnRef.current = col;
        setOverColumn(col);
        return;
      }
      const dx = evt.clientX - info.startX;
      const dy = evt.clientY - info.startY;
      if (Math.abs(dx) >= 10 || Math.abs(dy) >= 10) {
        if (Math.abs(dx) > Math.abs(dy)) {
          info.active = true;
          setDragLead(leadId);
        }
      }
    };
    const onUp = (evt: PointerEvent) => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      if (!info.active) return;
      const dropCol = overColumnRef.current
        ?? (document.elementFromPoint(evt.clientX, evt.clientY) as HTMLElement | null)?.closest("[data-column]")?.getAttribute("data-column") ?? null;
      const meta = leadMetaRef.current.get(leadId);
      if (dropCol && meta) {
        const current = optimisticRef.current.get(leadId) ?? meta.status;
        if (dropCol !== current) {
          commitStatus(leadId, dropCol as LeadStatus, meta.version);
        }
      }
      setDragLead(null);
      setOverColumn(null);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  return (
    <div>
      {(savingLead || error) && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-asg-border bg-white px-3 py-2 text-sm">
          {savingLead && <Loader2 className="h-4 w-4 animate-spin text-asg-gold-dark" />}
          {savingLead && <span className="text-asg-text-secondary">Updating pipeline…</span>}
          {error && <><AlertCircle className="h-4 w-4 text-asg-danger" /><span className="text-asg-danger">{error}</span></>}
        </div>
      )}

      {/* Tablet/desktop: horizontal scroll of drag-drop columns */}
      <div className="hidden gap-4 overflow-x-auto pb-4 md:flex md:snap-x">
        {BOARD_COLUMNS.map((status) => {
          const items = byStatus.get(status) ?? [];
          return (
            <div
              key={status}
              data-column={status}
              className={cn(
                "w-64 flex-shrink-0 snap-start rounded-xl border bg-white p-2 transition-colors",
                COLUMN_ACCENTS[status] ?? "border-asg-border",
                overColumn === status && dragLead ? "bg-asg-gold-subtle" : ""
              )}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-semibold text-asg-text">{status}</span>
                <span className="rounded-full bg-asg-cream px-2 text-xs font-medium text-asg-text-secondary">{items.length}</span>
              </div>
              <div className="mt-1 min-h-[120px] space-y-2">
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-asg-border px-3 py-4 text-center text-xs text-asg-text-muted">
                    Drop here
                  </p>
                )}
                {items.map((lead) => (
                  <div
                    key={lead.leadId}
                    onPointerDown={onCardPointerDown(lead.leadId)}
                    className={cn(
                      "touch-pan-y rounded-lg border border-asg-border bg-white p-2.5 shadow-sm select-none",
                      dragLead === lead.leadId && "opacity-50",
                      savingLead === lead.leadId && "animate-pulse"
                    )}
                  >
                    <Link href={`/leads/${lead.leadId}`} className="pointer-events-auto block">
                      <p className="truncate text-sm font-medium text-asg-text">{lead.name}</p>
                      <p className="truncate text-xs text-asg-text-muted">{lead.suburb ?? lead.leadId}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-asg-text-secondary">
                          <Phone className="h-3 w-3" /> {lead.mobile}
                        </span>
                        <StatusBadge status={lead.status as LeadStatus} />
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {typeof totalUnmatched === "number" && totalUnmatched > 0 && (
          <p className="w-64 flex-shrink-0 self-start p-4 text-xs text-asg-text-muted">
            {totalUnmatched} lead{totalUnmatched !== 1 ? "s" : ""} not shown
          </p>
        )}
      </div>

      {/* Phones: accordion columns, tap to expand */}
      <div className="space-y-2 md:hidden">
        {BOARD_COLUMNS.map((status) => {
          const items = byStatus.get(status) ?? [];
          const open = openColumns.has(status);
          return (
            <div key={status} className="overflow-hidden rounded-xl border border-asg-border bg-white">
              <button
                onClick={() => setOpenColumns((prev) => {
                  const next = new Set(prev);
                  if (next.has(status)) next.delete(status);
                  else next.add(status);
                  return next;
                })}
                className="flex min-h-[44px] w-full items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-semibold text-asg-text">{status}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-asg-cream px-2 text-xs font-medium text-asg-text-secondary">{items.length}</span>
                  <ChevronDown className={cn("h-4 w-4 text-asg-text-muted transition-transform", open && "rotate-180")} />
                </span>
              </button>
              {open && (
                <div className="space-y-2 border-t border-asg-border p-3">
                  {items.length === 0 && (
                    <p className="py-2 text-center text-xs text-asg-text-muted">No leads here.</p>
                  )}
                  {items.map((lead) => (
                    <div key={lead.leadId} className="rounded-lg border border-asg-border p-3">
                      <Link href={`/leads/${lead.leadId}`} className="block">
                        <p className="text-sm font-medium text-asg-text">{lead.name}</p>
                        <p className="text-xs text-asg-text-muted">{lead.leadId} · {lead.suburb ?? "—"}</p>
                      </Link>
                      <div className="mt-2 flex items-center justify-between">
                        <a href={`tel:${lead.mobile.replace(/\s/g, "")}`} className="flex min-h-[36px] items-center gap-1 rounded-md bg-asg-gold-subtle px-2 text-xs font-medium text-asg-gold-dark">
                          <Phone className="h-3 w-3" /> {lead.mobile}
                        </a>
                        <StatusBadge status={lead.status as LeadStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {typeof totalUnmatched === "number" && totalUnmatched > 0 && (
          <p className="p-2 text-xs text-asg-text-muted">{totalUnmatched} lead{totalUnmatched !== 1 ? "s" : ""} not shown</p>
        )}
      </div>
    </div>
  );
}
