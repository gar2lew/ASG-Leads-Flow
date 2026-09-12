// ============================================
// ASG Leads — New Survey Page Client Component
// ============================================
// Real Firestore-backed survey with autosave and lead conversion

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, ChevronLeft, ChevronRight, UserPlus, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HousingStatus,
  EmploymentStatus,
  SuperannuationRange,
  CostOfLivingAnswer,
  TaxAnswer,
  LeadCaptureDraft,
  getHousingStatusLabel,
  getEmploymentStatusLabel,
  getSuperannuationRangeLabel,
  getCostOfLivingLabel,
  getTaxLabel,
  HOUSING_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  SUPERANNUATION_RANGE_OPTIONS,
  COST_OF_LIVING_OPTIONS,
  TAX_OPTIONS,
} from "@/lib/domain/survey";

interface SurveyResponse {
  responseId: string;
  sequenceNumber: number;
  costOfLivingIncreased: CostOfLivingAnswer;
  payingTooMuchTax: TaxAnswer;
  housingStatus: HousingStatus | null;
  employmentStatus: EmploymentStatus | null;
  superannuation: SuperannuationRange | null;
  becameLead: boolean;
  leadId: string | null;
  leadCaptureDraft: LeadCaptureDraft | null;
}

interface SurveySession {
  sessionId: string;
  officeId: string;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  respondentCount: number;
  leadCount: number;
}

export default function NewSurveyPage() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [session, setSession] = useState<SurveySession | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [converting, setConverting] = useState(false);
  
  // Debounced autosave
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<{ responseId: string; updates: Partial<SurveyResponse> } | null>(null);

  // Initialize survey session
  useEffect(() => {
    let cancelled = false;
    
    const init = async () => {
      setError(null);
      try {
        const officeId = profile?.primaryOfficeId ?? "perth";
        const res = await fetch("/api/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ officeId }),
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Failed to create survey session");
        }
        
        const data = await res.json();
        if (cancelled) return;
        const sessionId = data.sessionId;
        
        // Create 10 empty responses
        const newResponses: SurveyResponse[] = [];
        for (let i = 1; i <= 10; i++) {
          const res = await fetch(`/api/surveys/${sessionId}/responses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sequenceNumber: i }),
          });
          
          if (res.ok) {
            const data = await res.json();
            newResponses.push({
              responseId: data.responseId,
              sequenceNumber: i,
              costOfLivingIncreased: null,
              payingTooMuchTax: null,
              housingStatus: null,
              employmentStatus: null,
              superannuation: null,
              becameLead: false,
              leadId: null,
              leadCaptureDraft: null,
            });
          }
        }
        
        if (cancelled) return;
        setSession({ sessionId, officeId: profile?.primaryOfficeId ?? "perth", status: "in_progress", respondentCount: 10, leadCount: 0 });
        setResponses(newResponses);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      }
    };
    
    init();
    return () => { cancelled = true; };
  }, [profile?.primaryOfficeId]);

  const currentResponse = responses[currentIndex];

  // Debounced autosave - flushSave must be declared first because scheduleSave calls it
  const flushSave = useCallback(async () => {
    if (!pendingSaveRef.current || !session) return;
    
    const { responseId, updates } = pendingSaveRef.current;
    pendingSaveRef.current = null;
    
    try {
      const res = await fetch(`/api/surveys/${session.sessionId}/responses/${responseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Save failed");
      }
      
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      setSaveStatus("error");
      console.error("Autosave failed:", err);
    }
  }, [session]);

  const scheduleSave = useCallback((updates: Partial<SurveyResponse>) => {
    if (!currentResponse) return;
    
    pendingSaveRef.current = { responseId: currentResponse.responseId, updates };
    setSaveStatus("saving");
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      flushSave();
    }, 500);
  }, [currentResponse, flushSave]);

  // Immediate update for UI responsiveness
  const updateResponse = useCallback((updates: Partial<SurveyResponse>) => {
    if (!currentResponse) return;
    
    setResponses((prev) =>
      prev.map((r) => (r.responseId === currentResponse.responseId ? { ...r, ...updates } : r))
    );
    scheduleSave(updates);
  }, [currentResponse, scheduleSave]);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  const submitSurvey = useCallback(async () => {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    
    try {
      // Flush any pending saves first
      await flushSave();
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Complete the survey
      const res = await fetch(`/api/surveys/${session.sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to complete survey");
      }
      
      router.push("/surveys/history");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }, [session, flushSave, router]);

  const convertToLead = useCallback(async () => {
    if (!currentResponse || !session) return;
    setConverting(true);
    setError(null);
    
    try {
      const leadData = {
        name: currentResponse.leadCaptureDraft?.name ?? "",
        mobile: currentResponse.leadCaptureDraft?.mobile ?? "",
        address: currentResponse.leadCaptureDraft?.address ?? "",
        notes: currentResponse.leadCaptureDraft?.notes ?? "",
      };
      
      if (!leadData.name || !leadData.mobile || !leadData.address) {
        throw new Error("Name, mobile, and address are required");
      }
      
      const res = await fetch(`/api/surveys/${session.sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert",
          responseId: currentResponse.responseId,
          leadData,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        
        if (err.error?.code === "DUPLICATE_MOBILE") {
          setError("A lead with this mobile number already exists");
          setShowLeadCapture(true);
          return;
        }
        
        throw new Error(err.error?.message || "Failed to convert to lead");
      }
      
      const data = await res.json();
      
      // Update local state
      setResponses((prev) =>
        prev.map((r) =>
          r.responseId === currentResponse.responseId
            ? { ...r, becameLead: true, leadId: data.leadId, leadCaptureDraft: null }
            : r
        )
      );
      
      setSession((prev) => prev ? { ...prev, leadCount: prev.leadCount + 1 } : prev);
      setShowLeadCapture(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConverting(false);
    }
  }, [currentResponse, session]);

  const handleLeadCaptureChange = useCallback((field: keyof LeadCaptureDraft, value: string) => {
    if (!currentResponse) return;
    updateResponse({
      leadCaptureDraft: {
        ...currentResponse.leadCaptureDraft,
        [field]: value,
      },
    });
  }, [currentResponse, updateResponse]);

  // Compute values for render states (hooks must come before early returns)
  const leadsCaptured = useMemo(() => responses.filter((r) => r.becameLead).length, [responses]);
  const errorMessage = useMemo(() => error, [error]);
  const showLoading = useMemo(() => !session || responses.length === 0, [session, responses]);

  if (error && !session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-asg-danger-subtle">
          <AlertCircle className="h-7 w-7 text-asg-danger" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-asg-text">Survey Error</h1>
        <p className="mt-2 text-sm text-asg-text-secondary">{errorMessage}</p>
        <button onClick={() => window.location.reload()} className="mt-4 asg-button-primary">Retry</button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-asg-success-subtle">
          <CheckCircle2 className="h-10 w-10 text-asg-success" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-asg-text">Survey Complete</h1>
        <p className="mt-2 text-lg text-asg-text-secondary">
          {responses.length} respondents · {leadsCaptured} lead{leadsCaptured !== 1 ? "s" : ""} captured
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={submitSurvey} disabled={submitting} className="asg-button-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Submit Survey
          </button>
          <button onClick={() => window.location.reload()} className="asg-button-secondary">Start Another</button>
          <button onClick={() => router.push("/dashboard")} className="asg-button-ghost">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  if (showLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-asg-gold" />
        <p className="mt-4 text-asg-text-secondary">Loading survey...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-asg-gold">{session?.officeId ?? profile?.primaryOfficeId ?? "Perth"}</p>
        <h1 className="mt-1 text-2xl font-semibold text-asg-text">Community Awareness Survey</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">{profile?.displayName ?? profile?.email ?? "Rep"} · {new Date().toLocaleDateString("en-AU")}</p>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-asg-text-muted">Respondent {String(currentIndex + 1).padStart(2, "0")} / {responses.length}</span>
        <span className={cn("text-xs font-medium", saveStatus === "saving" ? "text-asg-warning" : saveStatus === "saved" ? "text-asg-success" : "text-asg-text-muted")}>
          {saveStatus === "saving" && <Loader2 className="h-3 w-3 inline animate-spin mr-1" />}
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Ready"}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-asg-border">
        <div
          className="h-full bg-asg-gold transition-all"
          style={{ width: `${((currentIndex + 1) / responses.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-asg-border bg-white p-5 shadow-sm">
        <Question
          label="Has the cost of living increased recently?"
          value={currentResponse?.costOfLivingIncreased ?? null}
          onChange={(v) => updateResponse({ costOfLivingIncreased: v })}
          options={COST_OF_LIVING_OPTIONS}
          getLabel={getCostOfLivingLabel}
        />
        <Question
          label="Do you think you are paying too much tax?"
          value={currentResponse?.payingTooMuchTax ?? null}
          onChange={(v) => updateResponse({ payingTooMuchTax: v })}
          options={TAX_OPTIONS}
          getLabel={getTaxLabel}
        />
        <Question
          label="Housing"
          value={currentResponse?.housingStatus ?? null}
          onChange={(v) => updateResponse({ housingStatus: v })}
          options={HOUSING_STATUS_OPTIONS}
          getLabel={getHousingStatusLabel}
        />
        <Question
          label="Employment"
          value={currentResponse?.employmentStatus ?? null}
          onChange={(v) => updateResponse({ employmentStatus: v })}
          options={EMPLOYMENT_STATUS_OPTIONS}
          getLabel={getEmploymentStatusLabel}
        />
        <Question
          label="Superannuation"
          value={currentResponse?.superannuation ?? null}
          onChange={(v) => updateResponse({ superannuation: v })}
          options={SUPERANNUATION_RANGE_OPTIONS}
          getLabel={getSuperannuationRangeLabel}
        />

        <div className="border-t border-asg-border pt-5">
          <p className="text-sm font-medium text-asg-text">Would this person like to provide their details?</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setShowLeadCapture(true)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                currentResponse?.becameLead
                  ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark"
                  : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
              )}
            >
              <UserPlus className="h-4 w-4" />
              {currentResponse?.becameLead ? "Lead Captured" : "Yes — Add Lead"}
            </button>
            <button
              onClick={() => updateResponse({ becameLead: false, leadCaptureDraft: null })}
              className={cn(
                "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                !currentResponse?.becameLead && !showLeadCapture
                  ? "border-asg-navy bg-asg-navy text-white"
                  : "border-asg-border bg-white text-asg-text hover:border-asg-navy"
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
          {String(currentIndex + 1).padStart(2, "0")} / {String(responses.length).padStart(2, "0")}
        </span>
        {currentIndex < responses.length - 1 ? (
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
                value={currentResponse?.leadCaptureDraft?.name ?? ""}
                onChange={(e) => handleLeadCaptureChange("name", e.target.value)}
                className="asg-input"
              />
              <input
                type="tel"
                placeholder="Mobile"
                value={currentResponse?.leadCaptureDraft?.mobile ?? ""}
                onChange={(e) => handleLeadCaptureChange("mobile", e.target.value)}
                className="asg-input"
              />
              <input
                type="text"
                placeholder="Address"
                value={currentResponse?.leadCaptureDraft?.address ?? ""}
                onChange={(e) => handleLeadCaptureChange("address", e.target.value)}
                className="asg-input"
              />
              <textarea
                placeholder="Additional notes"
                value={currentResponse?.leadCaptureDraft?.notes ?? ""}
                onChange={(e) => handleLeadCaptureChange("notes", e.target.value)}
                className="asg-textarea"
                rows={3}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowLeadCapture(false)} className="asg-button-secondary">Cancel</button>
              <button
                onClick={convertToLead}
                disabled={converting}
                className="asg-button-primary"
              >
                {converting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Lead"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
          <div className="flex items-center gap-3 text-asg-danger p-4 rounded-lg border border-asg-danger/30 bg-asg-danger-subtle shadow-lg max-w-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-asg-danger hover:underline">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Question<T extends string | null>({
  label,
  value,
  onChange,
  options,
  getLabel,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  getLabel: (value: T) => string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-asg-text">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option)}
            onClick={() => onChange(option)}
            className={cn(
              "min-w-[80px] rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              value === option
                ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark"
                : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
            )}
          >
            {getLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}