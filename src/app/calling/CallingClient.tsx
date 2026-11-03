// ============================================
// ASG Leads — Calling Workspace Client
// ============================================
// Real Firestore-backed calling with claim/lease management

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { Phone, SkipBack, SkipForward, Loader2, Shield, XCircle, AlertCircle, Home, PiggyBank, Briefcase, User, CheckCircle2 } from "lucide-react";
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
  activeCallLease?: {
    claimedBy: string;
    claimedAt: string;
    expiresAt: string;
  } | null;
  surveyRatings?: { costOfLiving?: number | null; tooMuchTax?: number | null; renterOwner?: number | null; ftPt?: number | null; superannuation?: number | null } | null;
  renterOwner?: string;
  employmentStatus?: string;
  superannuation?: string;
  costOfLivingResponse?: boolean;
  taxResponse?: boolean;
}

const CALL_RESULTS = [
  "No Answer", "Contacted", "Interested", "Callback", "Qualified", "Booked", "Not Interested", "Wrong Number", "Disqualified"
];

export function CallingClient() {
  const router = useRouter();
  const { profile } = useAuth();
  const claimCheckRef = useRef<NodeJS.Timeout | null>(null);
  
  const [queue, setQueue] = useState<Lead[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [currentClaim, setCurrentClaim] = useState<{ expiresAt: Date; leadId: string } | null>(null);

  // Call form state
  const [result, setResult] = useState("");
  const [note, setNote] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch call queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calling/queue");
      if (!response.ok) throw new Error("Failed to fetch call queue");
      const data = await response.json();
      setQueue(data.leads || []);
      setIndex(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Stop claim refresh interval
  const stopClaimRefresh = useCallback(() => {
    if (claimCheckRef.current) {
      clearInterval(claimCheckRef.current);
      claimCheckRef.current = null;
    }
  }, []);

  // Start claim refresh interval
  const startClaimRefresh = useCallback((leadId: string) => {
    stopClaimRefresh();
    claimCheckRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim" }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.expiresAt) {
            setCurrentClaim({ expiresAt: new Date(data.expiresAt), leadId });
          } else {
            stopClaimRefresh();
          }
        } else {
          stopClaimRefresh();
        }
      } catch {
        stopClaimRefresh();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
  }, [stopClaimRefresh]);

  // Acquire claim for current lead
  const acquireClaim = useCallback(async (leadId: string) => {
    setClaiming(true);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.expiresAt) {
          setCurrentClaim({ expiresAt: new Date(data.expiresAt), leadId });
          startClaimRefresh(leadId);
          return true;
        }
      } else if (response.status === 409) {
        const errorData = await response.json();
        if (errorData.error?.code === "ALREADY_CLAIMED") {
          setError("This lead is currently being worked by another rep");
          return false;
        }
      }
      
      setError("Failed to claim lead");
      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setClaiming(false);
    }
  }, [startClaimRefresh]);

  // Release current claim
  const releaseClaim = useCallback(async () => {
    if (!currentClaim) return;
    try {
      await fetch(`/api/leads/${currentClaim.leadId}`, { method: "DELETE" });
      setCurrentClaim(null);
      stopClaimRefresh();
    } catch {
      // Ignore errors during release
    }
  }, [currentClaim, stopClaimRefresh]);

  // Initialize
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue();
    return () => stopClaimRefresh();
  }, [fetchQueue, stopClaimRefresh]);

  // Claim lead when index changes
  useEffect(() => {
    if (queue.length > 0 && queue[index]) {
      const lead = queue[index];
      if (lead.activeCallLease) {
        const expiresAt = new Date(lead.activeCallLease.expiresAt);
        if (expiresAt > new Date() && lead.activeCallLease.claimedBy !== profile?.uid) {
          // Someone else has an active claim
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setError(`This lead is currently being worked by another rep (expires ${expiresAt.toLocaleTimeString()})`);
          setCurrentClaim({ expiresAt, leadId: lead.leadId });
        } else {
          // Claim is ours or expired - acquire it
          acquireClaim(lead.leadId);
        }
      } else {
        // No claim - acquire it
        acquireClaim(lead.leadId);
      }
    }
  }, [index, queue, profile, acquireClaim]);

  const lead = queue[index];

  const handleSaveAndNext = async () => {
    if (!result || !lead || !profile) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/leads/${lead.leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "call-result",
          callResult: result,
          note: note || undefined,
          callbackDate: callbackDate || undefined,
          callbackTime: callbackTime || undefined,
          expectedVersion: lead.version,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          // Release current claim
          await releaseClaim();
          
          // Move to next lead
          if (index < queue.length - 1) {
            setIndex(index + 1);
          } else {
            router.push("/dashboard");
          }
          
          // Reset form
          setResult("");
          setNote("");
          setCallbackDate("");
          setCallbackTime("");
          setBookingDate("");
        } else {
          setError("Failed to save call result");
        }
      } else if (response.status === 409) {
        const errorData = await response.json();
        setError(errorData.error?.message || "This lead was updated by another user. Please refresh and try again.");
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || "Failed to save call result");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (index < queue.length - 1) {
      releaseClaim();
      setIndex(index + 1);
    }
  };

  const handlePrevious = () => {
    if (index > 0) {
      releaseClaim();
      setIndex(index - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-asg-gold" />
        <p className="mt-4 text-asg-text-secondary">Loading call queue...</p>
      </div>
    );
  }

  if (error && queue.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-asg-danger-subtle">
          <XCircle className="h-7 w-7 text-asg-danger" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-asg-text">Call Queue Error</h1>
        <p className="mt-2 text-sm text-asg-text-secondary">{error}</p>
        <button onClick={fetchQueue} className="mt-4 asg-button-primary">Retry</button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-asg-gold-subtle">
          <Phone className="h-7 w-7 text-asg-gold-dark" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-asg-text">No leads in call queue</h1>
        <p className="mt-2 text-sm text-asg-text-secondary">There are no leads assigned to you right now.</p>
      </div>
    );
  }

  // Check if current lead is claimed by someone else
  const isClaimedByOther = lead?.activeCallLease && 
    new Date(lead.activeCallLease.expiresAt) > new Date() && 
    lead.activeCallLease.claimedBy !== profile?.uid;

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-asg-text">Call Queue</h1>
        <p className="text-sm text-asg-text-muted">
          {index + 1} of {queue.length}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 text-asg-danger p-4 rounded-lg border border-asg-danger/30 bg-asg-danger-subtle">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-asg-border bg-white shadow-sm">
        <div className="bg-asg-navy px-5 py-5 text-white relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-asg-gold">Now Calling</p>
              <h2 className="mt-1 text-2xl font-semibold">{lead?.name}</h2>
              <a href={`tel:${lead?.mobile.replace(/\s/g, "")}`} className="mt-1 flex items-center gap-2 text-lg text-white/90 hover:text-asg-gold">
                <Phone className="h-5 w-5" />
                {lead?.mobile}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={lead?.status as any} />
              {currentClaim && (
                <span className="flex items-center gap-1 text-xs text-asg-gold/80 bg-asg-gold-subtle px-2 py-1 rounded">
                  <Shield className="h-3 w-3" />
                  Claimed until {currentClaim.expiresAt.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {isClaimedByOther && (
          <div className="border-t border-asg-border bg-asg-danger-subtle p-4 text-center text-asg-danger">
            <p className="font-medium">This lead is currently being worked by another rep</p>
            <p className="text-sm mt-1">Their claim expires at {new Date(lead.activeCallLease!.expiresAt).toLocaleTimeString()}</p>
            <p className="text-sm mt-1">Please wait or select another lead</p>
          </div>
        )}

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <Home className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead?.renterOwner || "—"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <PiggyBank className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead?.superannuation || "—"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <Briefcase className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead?.employmentStatus || "—"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <User className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead?.officeId}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-asg-text">Source</p>
            <p className="text-sm text-asg-text-secondary">{lead?.source}</p>
          </div>

          {lead?.surveyRatings && Object.values(lead.surveyRatings).some((v) => v != null) && (
            <div className="rounded-lg border border-asg-border bg-asg-cream/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-asg-text-secondary">Survey Ratings</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {([
                  ["Cost of Living", lead.surveyRatings.costOfLiving],
                  ["Too Much Tax", lead.surveyRatings.tooMuchTax],
                  ["Renter/Owner", lead.surveyRatings.renterOwner],
                  ["FT/PT", lead.surveyRatings.ftPt],
                  ["Super", lead.surveyRatings.superannuation],
                ] as [string, number | null | undefined][]).filter(([, v]) => v != null).map(([label, v]) => (
                  <div key={label} className="rounded-mdborder border-asg-border bg-white px-2.5 py-1.5">
                    <span className="text-xs text-asg-text-muted">{label}</span>
                    <span className="ml-1.5 font-medium text-asg-text">{v}/10</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(lead?.costOfLivingResponse !== undefined || lead?.taxResponse !== undefined) && (
            <div className="rounded-lg border border-asg-border bg-asg-cream/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-asg-text-secondary">Survey Information</p>
              <div className="mt-2 space-y-1 text-sm">
                {lead?.costOfLivingResponse !== undefined && (
                  <p className="text-asg-text-secondary">Cost of Living Increased: <span className="font-medium text-asg-text">{lead.costOfLivingResponse ? "Yes" : "No"}</span></p>
                )}
                {lead?.taxResponse !== undefined && (
                  <p className="text-asg-text-secondary">Too Much Tax: <span className="font-medium text-asg-text">{lead.taxResponse ? "Yes" : "No"}</span></p>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-asg-text">Call Result</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CALL_RESULTS.map((r) => (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                    result === r ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark" : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {result && (
            <div className="animate-fade-in space-y-4 border-t border-asg-border pt-4">
              <div>
                <label className="block text-sm font-medium text-asg-text">Notes</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="asg-textarea mt-1"
                  placeholder="Add a note about this call..."
                />
              </div>

              {result === "Callback" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-asg-text">Callback Date</label>
                    <input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} className="asg-input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-asg-text">Callback Time</label>
                    <input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)} className="asg-input mt-1" />
                  </div>
                </div>
              )}

              {result === "Booked" && (
                <div>
                  <label className="block text-sm font-medium text-asg-text">Appointment Date & Time</label>
                  <input type="datetime-local" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="asg-input mt-1" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-asg-border bg-asg-cream/30 p-4">
          <button
            onClick={handlePrevious}
            disabled={index === 0 || isClaimedByOther || claiming}
            className="asg-button-secondary"
          >
            <SkipBack className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={handleSkip}
            disabled={isClaimedByOther || claiming}
            className="asg-button-ghost"
          >
            Skip
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={handleSaveAndNext}
            disabled={!result || isSaving || isClaimedByOther || claiming}
            className="asg-button-primary flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                Save & Next
                {!isSaving && <CheckCircle2 className="h-4 w-4" />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}