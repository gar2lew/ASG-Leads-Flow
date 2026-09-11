"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { CheckCircle2, ChevronLeft, ChevronRight, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SurveyRespondent, EmploymentStatus, RenterOwner, SuperannuationRange } from "@/lib/types";
import { defaultSurveyRespondents } from "@/lib/mock-data";

const employmentOptions: EmploymentStatus[] = ["Full Time", "Part Time", "Self Employed", "Unemployed", "Retired"];
const housingOptions: RenterOwner[] = ["Renter", "Owner", "Other"];
const superOptions: SuperannuationRange[] = ["Under $50k", "$50k - $100k", "$75k - $150k", "$100k - $200k", "$200k - $500k", "$500k+", "Don't Know"];

export default function NewSurveyPage() {
  const router = useRouter();
  const { currentUser, addSurveySession, addLead } = useApp();
  const [respondents, setRespondents] = useState<SurveyRespondent[]>(defaultSurveyRespondents());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);

  const respondent = respondents[currentIndex];

  const updateRespondent = (updates: Partial<SurveyRespondent>) => {
    setRespondents((prev) =>
      prev.map((r) => (r.id === respondent.id ? { ...r, ...updates } : r))
    );
    setSaving(true);
    setTimeout(() => setSaving(false), 400);
  };

  const handleComplete = () => {
    setIsComplete(true);
  };

  const submitSurvey = () => {
    const leadsCaptured = respondents.filter((r) => r.isLead).length;
    const session = {
      id: `s-${Date.now()}`,
      rep: currentUser.name,
      office: currentUser.office as any,
      date: new Date().toISOString().split("T")[0],
      respondents: respondents.length,
      leadsCaptured,
      status: "Submitted" as const,
      completedAt: new Date().toISOString(),
    };
    addSurveySession(session);

    respondents.filter((r) => r.isLead).forEach((r) => {
      addLead({
        id: `l-${Date.now()}-${r.index}`,
        leadId: `ASG-2026-${1000 + Math.floor(Math.random() * 9000)}`,
        name: r.name || "Unknown",
        mobile: r.mobile || "",
        address: r.address || "",
        suburb: "",
        office: currentUser.office as any,
        assignedRep: currentUser.name,
        source: "Community Survey",
        status: "New",
        notes: r.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        renterOwner: r.housing || undefined,
        employmentStatus: r.employment || undefined,
        superannuation: r.superannuation || undefined,
        costOfLivingResponse: r.costOfLiving || undefined,
        taxResponse: r.tooMuchTax || undefined,
      });
    });

    router.push("/surveys/history");
  };

  if (isComplete) {
    const leadsCaptured = respondents.filter((r) => r.isLead).length;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-asg-success-subtle">
          <CheckCircle2 className="h-10 w-10 text-asg-success" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-asg-text">Survey Complete</h1>
        <p className="mt-2 text-lg text-asg-text-secondary">
          {respondents.length} respondents · {leadsCaptured} lead{leadsCaptured !== 1 ? "s" : ""} captured
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={submitSurvey} className="asg-button-primary">Submit Survey</button>
          <button onClick={() => { setRespondents(defaultSurveyRespondents()); setIsComplete(false); setCurrentIndex(0); }} className="asg-button-secondary">Start Another</button>
          <button onClick={() => router.push("/dashboard")} className="asg-button-ghost">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-asg-gold">{currentUser.office}</p>
        <h1 className="mt-1 text-2xl font-semibold text-asg-text">Community Awareness Survey</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">{currentUser.name} · {new Date().toLocaleDateString("en-AU")}</p>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-asg-text-muted">Respondent {String(currentIndex + 1).padStart(2, "0")} / {respondents.length}</span>
        <span className={cn("text-xs font-medium", saving ? "text-asg-warning" : "text-asg-success")}>
          {saving ? "Saving..." : "Saved"}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-asg-border">
        <div
          className="h-full bg-asg-gold transition-all"
          style={{ width: `${((currentIndex + 1) / respondents.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-asg-border bg-white p-5 shadow-sm">
        <Question
          label="Has the cost of living increased recently?"
          value={respondent.costOfLiving}
          onChange={(v) => updateRespondent({ costOfLiving: v })}
          options={["Yes", "No"]}
        />
        <Question
          label="Do you think you are paying too much tax?"
          value={respondent.tooMuchTax}
          onChange={(v) => updateRespondent({ tooMuchTax: v })}
          options={["Yes", "No"]}
        />
        <Question
          label="Housing"
          value={respondent.housing}
          onChange={(v) => updateRespondent({ housing: v })}
          options={housingOptions}
        />
        <Question
          label="Employment"
          value={respondent.employment}
          onChange={(v) => updateRespondent({ employment: v })}
          options={employmentOptions}
        />
        <Question
          label="Superannuation"
          value={respondent.superannuation}
          onChange={(v) => updateRespondent({ superannuation: v })}
          options={superOptions}
        />

        <div className="border-t border-asg-border pt-5">
          <p className="text-sm font-medium text-asg-text">Would this person like to provide their details?</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setShowLeadCapture(true)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                respondent.isLead ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark" : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
              )}
            >
              <UserPlus className="h-4 w-4" />
              {respondent.isLead ? "Lead Captured" : "Yes — Add Lead"}
            </button>
            <button
              onClick={() => updateRespondent({ isLead: false })}
              className={cn(
                "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                !respondent.isLead && !showLeadCapture ? "border-asg-navy bg-asg-navy text-white" : "border-asg-border bg-white text-asg-text hover:border-asg-navy"
              )}
            >
              No
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="asg-button-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="text-sm font-medium text-asg-text-muted">
          {String(currentIndex + 1).padStart(2, "0")} / {String(respondents.length).padStart(2, "0")}
        </span>
        {currentIndex < respondents.length - 1 ? (
          <button onClick={() => setCurrentIndex(currentIndex + 1)} className="asg-button-primary">
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handleComplete} className="asg-button-primary">
            Complete
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {showLeadCapture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLeadCapture(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-asg-border bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-asg-text">Lead Details</h3>
              <button onClick={() => setShowLeadCapture(false)} className="text-asg-text-muted hover:text-asg-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={respondent.name || ""}
                onChange={(e) => updateRespondent({ name: e.target.value })}
                className="asg-input"
              />
              <input
                type="tel"
                placeholder="Mobile"
                value={respondent.mobile || ""}
                onChange={(e) => updateRespondent({ mobile: e.target.value })}
                className="asg-input"
              />
              <input
                type="text"
                placeholder="Address"
                value={respondent.address || ""}
                onChange={(e) => updateRespondent({ address: e.target.value })}
                className="asg-input"
              />
              <textarea
                placeholder="Additional notes"
                value={respondent.notes || ""}
                onChange={(e) => updateRespondent({ notes: e.target.value })}
                className="asg-textarea"
                rows={3}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowLeadCapture(false)} className="asg-button-secondary">Cancel</button>
              <button
                onClick={() => {
                  updateRespondent({ isLead: true });
                  setShowLeadCapture(false);
                }}
                className="asg-button-primary"
              >
                Save Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Question<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <div>
      <p className="text-sm font-medium text-asg-text">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              "min-w-[80px] rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              value === option ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark" : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
