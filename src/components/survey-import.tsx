"use client";

// ============================================
// ASG Leads — Survey Import Form (shared)
// ============================================
// Community Awareness Survey batch entry, modelled on the paper DQ sheet.
// Used embedded as the "Leads Import" tab on the Leads page and standalone
// at /leads/import.
//
// Survey answers follow the sheet:
//   • Cost of living increased recently?  -> Yes / No
//   • Paying too much tax?                -> Yes / No
//   • Renting or home-owner?              -> Renter / Owner
//   • Anyone work full-time?              -> Full Time / Part Time / No
//   • Household superannuation balance    -> office-specific brackets
//       Perth:    $0-75k, $75-150k, $150k+, Other
//       Brisbane: $0-100k, $100-200k, $250k+, Other

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertCircle, Loader2, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const SUPER_OPTIONS: Record<string, string[]> = {
  perth: ["$0-75k", "$75-150k", "$150k+", "Other"],
  brisbane: ["$0-100k", "$100-200k", "$250k+", "Other"],
};

const QUESTION_ROWS: {
  key: "costOfLivingResponse" | "taxResponse" | "renterOwner" | "employmentStatus" | "superannuation";
  label: string;
  options: string[];
}[] = [
  { key: "costOfLivingResponse", label: "Do you think the cost of living has increased recently?", options: ["Yes", "No"] },
  { key: "taxResponse", label: "Do you think you are paying too much tax?", options: ["Yes", "No"] },
  { key: "renterOwner", label: "Are you currently renting or are you a home-owner?", options: ["Renter", "Owner"] },
  { key: "employmentStatus", label: "Do you or anyone in the household work full-time?", options: ["Full Time", "Part Time", "No"] },
  { key: "superannuation", label: "What is your household superannuation balance?", options: [] }, // per office
];

type LeadRow = { name: string; address: string; contact: string };
const emptyRow = (): LeadRow => ({ name: "", address: "", contact: "" });

const DRAFT_KEY = "asg-lead-import-draft";

type Answers = {
  costOfLivingResponse?: string;
  taxResponse?: string;
  renterOwner?: string;
  employmentStatus?: string;
  superannuation?: string;
};

type Draft = {
  date: string;
  officeId: string;
  repName: string;
  answers: Answers;
  rows: LeadRow[];
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d.rows?.length) return { ...d, answers: d.answers ?? {} };
    }
  } catch {}
  return { date: new Date().toISOString().slice(0, 10), officeId: "perth", repName: "", answers: {}, rows: [emptyRow(), emptyRow(), emptyRow()] };
}

function buildNotes(answers: Answers, officeId: string, repName: string, date: string): string {
  const parts: string[] = [`Survey ${date} (${officeId})${repName ? ` by ${repName}` : ""}`];
  if (answers.costOfLivingResponse) parts.push(`Cost of Living increased: ${answers.costOfLivingResponse}`);
  if (answers.taxResponse) parts.push(`Too Much Tax: ${answers.taxResponse}`);
  if (answers.renterOwner) parts.push(answers.renterOwner);
  if (answers.employmentStatus) parts.push(answers.employmentStatus);
  if (answers.superannuation) parts.push(`Super ${answers.superannuation}`);
  return parts.join(" · ");
}

function normaliseOffice(v: unknown): string {
  return v === "brisbane" ? "brisbane" : "perth";
}

export default function SurveyImportForm({ embedded }: { embedded?: boolean }) {
  const { profile } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: { name: string; reason: string }[] } | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({ ...loadDraft(), repName: profile?.displayName ?? "", officeId: normaliseOffice(profile?.primaryOfficeId) });
  }, [profile?.displayName, profile?.primaryOfficeId]);

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const setAnswer = (key: keyof Answers, value: string) => {
    setDraft((d) => (d ? { ...d, answers: { ...d.answers, [key]: value || undefined } } : d));
  };

  const saveDraft = () => {
    if (!draft) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSaveNote("Draft saved ✓");
      setTimeout(() => setSaveNote(null), 2500);
    } catch {}
  };

  const setRow = (i: number, patch: Partial<LeadRow>) => {
    setDraft((d) => (d ? { ...d, rows: d.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) } : d));
  };

  const filledRows = useMemo(
    () => draft?.rows.filter((r) => r.name.trim() && r.contact.trim()) ?? [],
    [draft]
  );

  const submit = async () => {
    if (!draft) return;
    if (filledRows.length === 0) {
      setError("Add at least one lead row (name + contact number required).");
      return;
    }
    setSubmitting(true);
    setError(null);
    let created = 0;
    const skipped: { name: string; reason: string }[] = [];
    const survey = {
      importedAt: draft.date,
      repName: draft.repName || profile?.displayName || null,
      costOfLivingResponse: draft.answers.costOfLivingResponse === "Yes" ? true : draft.answers.costOfLivingResponse === "No" ? false : null,
      taxResponse: draft.answers.taxResponse === "Yes" ? true : draft.answers.taxResponse === "No" ? false : null,
      renterOwner: draft.answers.renterOwner ?? null,
      employmentStatus: draft.answers.employmentStatus ?? null,
      superannuation: draft.answers.superannuation ?? null,
    };
    // Sequential on purpose: avoids racing duplicate checks; batches are small (max 10 rows).
    for (const row of filledRows) {
      const mobile = row.contact.replace(/\s+/g, "");
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name.trim(),
          mobile,
          address: row.address.trim() || "—",
          suburb: "",
          officeId: draft.officeId,
          source: "community_survey",
          notes: buildNotes(draft.answers, draft.officeId, draft.repName, draft.date),
          survey,
        }),
      });
      if (res.ok) {
        created += 1;
      } else {
        const err = await res.json().catch(() => ({}));
        skipped.push({
          name: row.name.trim(),
          reason: err?.error?.code === "DUPLICATE_LEAD" ? "Duplicate mobile" : err?.error?.message || "Failed",
        });
      }
    }
    setSubmitting(false);
    if (created > 0) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
    }
    setResult({ created, skipped });
  };

  const resetForm = () => {
    setDraft({
      date: new Date().toISOString().slice(0, 10),
      officeId: normaliseOffice(profile?.primaryOfficeId),
      repName: profile?.displayName ?? "",
      answers: {},
      rows: [emptyRow(), emptyRow(), emptyRow()],
    });
    setResult(null);
  };

  if (!draft) return null;

  if (result) {
    return (
      <div className="animate-fade-in mx-auto max-w-lg">
        {!embedded && <BackToLeads />}
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-asg-border bg-white p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-asg-success-subtle">
            <CheckCircle2 className="h-8 w-8 text-asg-success" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-asg-text">
            {result.created} lead{result.created !== 1 ? "s" : ""} imported
          </h1>
          {result.skipped.length > 0 && (
            <div className="mt-4 w-full text-left">
              <p className="text-sm font-medium text-asg-warning">Skipped rows:</p>
              <ul className="mt-2 space-y-1 text-sm text-asg-text-secondary">
                {result.skipped.map((s, i) => (
                  <li key={i}>• {s.name}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={resetForm} className="asg-button-primary">Import another batch</button>
            {embedded ? (
              <Link href="/leads" className="asg-button-secondary" onClick={() => { try { sessionStorage.setItem("asg-leads-reload", "1"); } catch {} }}>
                Back to Call Tracking
              </Link>
            ) : (
              <Link href="/leads" className="asg-button-secondary" onClick={() => { try { sessionStorage.setItem("asg-leads-reload", "1"); } catch {} }}>
                Go to leads
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-3xl pb-28">
      {!embedded && <BackToLeads />}

      <div className="mt-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-asg-gold">Leads Import</p>
        <h1 className="mt-1 text-2xl font-semibold text-asg-text">Community Awareness Survey</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">
          One sheet per clip board — survey answers attach to every lead you enter below.
        </p>
      </div>

      {/* Session header */}
      <div className="mt-6 rounded-xl border border-asg-border bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-asg-text-muted">Date</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => update({ date: e.target.value })}
              className="asg-input mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-asg-text-muted">Office</label>
            <select value={draft.officeId} onChange={(e) => update({ officeId: e.target.value })} className="asg-input mt-1">
              <option value="perth">Perth</option>
              <option value="brisbane">Brisbane</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-asg-text-muted">Rep Name</label>
            <input
              type="text"
              value={draft.repName}
              onChange={(e) => update({ repName: e.target.value })}
              placeholder="Select name before submitting"
              className="asg-input mt-1"
            />
          </div>
        </div>

        {/* Survey question dropdowns — options straight off the paper sheet */}
        <div className="mt-6 space-y-4 border-t border-asg-border pt-5">
          {QUESTION_ROWS.map((row) => {
            const opts = row.key === "superannuation"
              ? SUPER_OPTIONS[normaliseOffice(draft.officeId)]
              : row.options;
            return (
              <div key={row.key} className="grid items-center gap-2 sm:grid-cols-[1fr_minmax(180px,240px)]">
                <p className="text-sm font-medium text-asg-text">{row.label}</p>
                <select
                  value={draft.answers[row.key] ?? ""}
                  onChange={(e) => setAnswer(row.key, e.target.value)}
                  className={cn("asg-select min-h-[44px] w-full", draft.answers[row.key] && "border-asg-gold")}
                  aria-label={row.label}
                >
                  <option value="">— Select —</option>
                  {opts.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead details grid */}
      <div className="mt-6 rounded-xl border border-asg-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-asg-text">Lead Details</h2>
          <span className="text-xs text-asg-text-muted">{filledRows.length} filled</span>
        </div>
        <div className="mt-4 space-y-3">
          {draft.rows.map((row, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-asg-border bg-asg-cream/40 p-2.5">
              <span className="flex h-11 min-w-[28px] items-center justify-center text-sm font-semibold text-asg-text-muted">{i + 1}</span>
              <div className="grid flex-1 gap-2 sm:grid-cols-4">
                <input
                  type="text"
                  placeholder="Lead Name"
                  value={row.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  className="asg-input min-h-[44px] sm:col-span-1"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={row.address}
                  onChange={(e) => setRow(i, { address: e.target.value })}
                  className="asg-input min-h-[44px] sm:col-span-2"
                />
                <input
                  type="tel"
                  placeholder="Contact Number"
                  value={row.contact}
                  onChange={(e) => setRow(i, { contact: e.target.value })}
                  className="asg-input min-h-[44px] sm:col-span-1"
                />
              </div>
              <button
                onClick={() => update({ rows: draft.rows.filter((_, idx) => idx !== i) })}
                aria-label={`Remove row ${i + 1}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-asg-text-muted hover:bg-asg-danger-subtle hover:text-asg-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {draft.rows.length < 10 && (
          <button
            onClick={() => update({ rows: [...draft.rows, emptyRow()] })}
            className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-asg-border text-sm font-medium text-asg-text-secondary hover:border-asg-gold hover:text-asg-gold-dark"
          >
            <Plus className="h-4 w-4" /> Add row ({draft.rows.length}/10)
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-asg-danger/30 bg-asg-danger-subtle p-3 text-sm text-asg-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-asg-border bg-white/95 px-4 py-3 backdrop-blur lg:pl-64">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={saveDraft} className="asg-button-secondary min-h-[48px] flex-1">
            <Save className="h-4 w-4" />
            {saveNote ?? "Save draft"}
          </button>
          <button onClick={() => void submit()} disabled={submitting} className="asg-button-primary min-h-[48px] flex-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit {filledRows.length > 0 ? `(${filledRows.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackToLeads() {
  return (
    <Link href="/leads" className="inline-flex items-center gap-1 text-sm font-medium text-asg-text-secondary hover:text-asg-gold-dark">
      ← Back to Leads
    </Link>
  );
}
