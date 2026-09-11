"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";
import { Phone, SkipBack, SkipForward, Calendar, MessageSquare, Bookmark, CheckCircle2, User, Home, Briefcase, PiggyBank } from "lucide-react";
import { Lead, CallResult } from "@/lib/types";
import { cn, generateId } from "@/lib/utils";

const callResults: CallResult[] = ["No Answer", "Contacted", "Interested", "Callback", "Qualified", "Booked", "Not Interested", "Wrong Number", "Disqualified"];

export default function CallingPage() {
  const router = useRouter();
  const { leads, currentUser, getOfficeLeads, updateLead, addActivity, addFollowUp } = useApp();
  const queue = getOfficeLeads().filter((l) => l.assignedRep === currentUser.name || currentUser.role !== "Rep");

  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<CallResult | "">("");
  const [note, setNote] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const lead = queue[index];

  const handleSaveAndNext = () => {
    if (!result) return;
    setIsSaving(true);
    const now = new Date().toISOString();
    const statusMap: Record<CallResult, Lead["status"]> = {
      "No Answer": "No Answer",
      "Contacted": "Contacted",
      "Interested": "Interested",
      "Callback": "Callback",
      "Qualified": "Qualified",
      "Booked": "Booked",
      "Not Interested": "Not Interested",
      "Wrong Number": "Wrong Number",
      "Disqualified": "Disqualified",
    };

    let nextFollowUp = lead.nextFollowUpAt;
    if (result === "Callback" && callbackDate && callbackTime) {
      nextFollowUp = new Date(`${callbackDate}T${callbackTime}`).toISOString();
      const followUpId = generateId("f");
      addFollowUp({
        id: followUpId,
        leadId: lead.id,
        leadName: lead.name,
        assignedRep: lead.assignedRep,
        office: lead.office,
        scheduledAt: nextFollowUp,
        lastCallResult: result,
        lastNote: note,
        status: "Pending",
      });
    }

    updateLead({
      ...lead,
      status: statusMap[result],
      notes: note || lead.notes,
      lastContactAt: now,
      nextFollowUpAt: nextFollowUp,
      updatedAt: now,
    });

    const activityId = generateId("a");
    addActivity({
      id: activityId,
      leadId: lead.id,
      type: "Call Completed",
      description: `${currentUser.name} called. Result: ${result}${note ? `. Note: ${note}` : ""}`,
      createdAt: now,
      createdBy: currentUser.name,
    });

    if (result === "Booked" && bookingDate) {
      const appointmentActivityId = `${activityId}-b`;
      addActivity({
        id: appointmentActivityId,
        leadId: lead.id,
        type: "Appointment Booked",
        description: `Appointment booked for ${new Date(bookingDate).toLocaleString("en-AU")}`,
        createdAt: now,
        createdBy: currentUser.name,
      });
    }

    setTimeout(() => {
      setIsSaving(false);
      setResult("");
      setNote("");
      setCallbackDate("");
      setCallbackTime("");
      setBookingDate("");
      if (index < queue.length - 1) {
        setIndex(index + 1);
      } else {
        router.push("/dashboard");
      }
    }, 500);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-asg-text">Call Queue</h1>
        <p className="text-sm text-asg-text-muted">
          {index + 1} of {queue.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-asg-border bg-white shadow-sm">
        <div className="bg-asg-navy px-5 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-asg-gold">Now Calling</p>
              <h2 className="mt-1 text-2xl font-semibold">{lead.name}</h2>
              <a href={`tel:${lead.mobile.replace(/\s/g, "")}`} className="mt-1 flex items-center gap-2 text-lg text-white/90 hover:text-asg-gold">
                <Phone className="h-5 w-5" />
                {lead.mobile}
              </a>
            </div>
            <StatusBadge status={lead.status} />
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <Home className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead.renterOwner || "—"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <PiggyBank className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead.superannuation || "—"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <Briefcase className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead.employmentStatus || "—"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-asg-border bg-asg-cream/50 px-3 py-2.5">
              <User className="h-4 w-4 text-asg-gold" />
              <span className="text-asg-text-secondary">{lead.office}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-asg-text">Source</p>
            <p className="text-sm text-asg-text-secondary">{lead.source}</p>
          </div>

          {(lead.costOfLivingResponse || lead.taxResponse) && (
            <div className="rounded-lg border border-asg-border bg-asg-cream/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-asg-text-secondary">Survey Information</p>
              <div className="mt-2 space-y-1 text-sm">
                {lead.costOfLivingResponse && (
                  <p className="text-asg-text-secondary">Cost of Living Increased: <span className="font-medium text-asg-text">{lead.costOfLivingResponse}</span></p>
                )}
                {lead.taxResponse && (
                  <p className="text-asg-text-secondary">Too Much Tax: <span className="font-medium text-asg-text">{lead.taxResponse}</span></p>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-asg-text">Call Result</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {callResults.map((r) => (
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
            onClick={() => setIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            className="asg-button-secondary"
          >
            <SkipBack className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={() => setIndex(Math.min(queue.length - 1, index + 1))}
            className="asg-button-ghost"
          >
            Skip
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={handleSaveAndNext}
            disabled={!result || isSaving}
            className="asg-button-primary flex-1"
          >
            {isSaving ? "Saving..." : "Save & Next"}
            {!isSaving && <CheckCircle2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
