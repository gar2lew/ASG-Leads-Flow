"use client";

// ============================================
// ASG Leads — Lead Import (Community Survey Batch)
// ============================================
// Fast tablet-first import screen modelled on the paper JotForm survey:
// one session sheet for the whole clip board — date, rep, the 1–10 rating
// batteries (Cost of Living, Too Much Tax, Renter/Owner, Full Time/Part
// Time, Superannuation) — plus a lead details grid of up to 10 rows
// (Lead Name, Address, Contact Number). Submitting creates one lead per
// filled row with the survey answers attached so reps see them on the
// lead while calling.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, Plus, Trash2, AlertCircle, Loader2, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingRow = "costOfLiving" | "tooMuchTax" | "renterOwner" | "ftPt" | "superannuation";
const RATING_ROWS: { key: RatingRow; label: string }[] = [
  { key: "costOfLiving", label: "Cost of Living" },
  { key: "tooMuchTax", label: "Too Much Tax" },
  { key: "renterOwner", label: "Renter / Owner" },
  { key: "ftPt", label: "Full Time / Part Time" },
  { key: "superannuation", label: "Superannuation" },
];

type LeadRow = { name: string; address: string; contact: string };
const emptyRow = (): LeadRow => ({ name: "", address: "", contact: "" });

const DRAFT_KEY = "asg-lead-import-draft";

type Draft = {
  date: string;
  officeId: string;
  repName: string;
  ratings: Partial<Record<RatingRow, number>>;
  rows: LeadRow[];
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d.rows?.length) return d;
    }
  } catch {}
  return { date: new Date().toISOString().slice(0, 10), officeId: "perth", repName: "", ratings: {}, rows: [emptyRow(), emptyRow(), emptyRow()] };
}

export default function LeadImportPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: { name: string; reason: string }[] } | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({ ...loadDraft(), repName: profile?.displayName ?? "" });
  }, [profile?.displayName]);

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const saveDraft = () => {
    if (!draft) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSaveNote("Draft saved on this device");
      setTimeout(() => setSaveNote(null), 2500);
    } catch {}
  };

  const setRating = (key: RatingRow, value: number) => {
    setDraft((d) => (d ? { ...d, ratings: { ...d.ratings, [key]: d.ratings[key] === value ? undefined : value } } : d));
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
      setError("Add at least one lead row (name + contact number).");
      return;
    }
    setSubmitting(true);
    setError(null);
    let created = 0;
    const skipped: { name: string; reason: string }[] = [];
    const survey = {
      importedAt: draft.date,
      repName: draft.repName || profile?.displayName || null,
      answers:
        draft.ratings.costOfLiving != null ? { costOfLiving: draft.ratings.costOfLiving } : null,
      ratings: {
        costOfLiving: draft.ratings.costOfLiving ?? null,
        tooMuchTax: draft.ratings.tooMuchTax ?? null,
        renterOwner: draft.ratings.renterOwner ?? null,
        ftPt: draft.ratings.ftPt ?? null,
        superannuation: draft.ratings.superannuation ?? null,
      },
    };
    // Sequential to avoid racing; small batches (max 10 rows) so this is fine.
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
          notes: buildNotes(draft.ratings, draft.repName, draft.date),
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
      officeId: profile?.primaryOfficeId ?? "perth",
      repName: profile?.displayName ?? "",
      ratings: {},
      rows: [emptyRow(), emptyRow(), emptyRow()],
    });
    setResult(null);
  };

  if (!draft) return null;

  if (result) {
    return (
      <div className="animate-fade-in mx-auto max-w-lg">
        <Link href="/leads" className="inline-flex items-center gap-1 text-sm font-medium text-asg-text-secondary hover:text-asg-gold-dark">
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>
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
            <Link href="/leads" className="asg-button-secondary" onClick={() => { try { sessionStorage.setItem("asg-leads-reload", "1"); } catch {} }}>Go to leads</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-3xl pb-28">
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm font-medium text-asg-text-secondary hover:text-asg-gold-dark">
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      <div className="mt-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-asg-gold">Lead Import</p>
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

        {/* Rating batteries */}
        <div className="mt-6 space-y-4 border-t border-asg-border pt-5">
          {RATING_ROWS.map((row) => (
            <div key={row.key}>
              <p className="text-sm font-medium text-asg-text">{row.label}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(row.key, n)}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                      draft.ratings[row.key] === n
                        ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark"
                        : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
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

function buildNotes(ratings: Partial<Record<RatingRow, number>>, repName: string, date: string): string {
  const parts: string[] = [`Survey ${date}${repName ? ` by ${repName}` : ""}`];
  const labels: [RatingRow, string][] = [
    ["costOfLiving", "Cost of Living"],
    ["tooMuchTax", "Too Much Tax"],
    ["renterOwner", "Renter/Owner"],
    ["ftPt", "FT/PT"],
    ["superannuation", "Superannuation"],
  ];
  for (const [key, label] of labels) {
    if (ratings[key] != null) parts.push(`${label} ${ratings[key]}/10`);
  }
  return parts.join(" · ");
}
