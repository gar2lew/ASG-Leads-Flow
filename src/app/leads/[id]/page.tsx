"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";
import { Phone, Calendar, MessageSquare, RotateCcw, Bookmark, MapPin, Building2, User, ArrowLeft, Clock } from "lucide-react";
import { LeadStatus, CallResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const statuses: LeadStatus[] = ["New", "No Answer", "Callback", "Contacted", "Interested", "Qualified", "Booked", "Revisit", "Not Interested", "Disqualified", "Wrong Number"];
const callResults: CallResult[] = ["No Answer", "Contacted", "Interested", "Callback", "Qualified", "Booked", "Not Interested", "Wrong Number", "Disqualified"];

export default function LeadDetailPage() {
  const params = useParams();
  const { leads, getLeadActivities, currentUser, updateLead, addActivity, addFollowUp } = useApp();
  const lead = leads.find((l) => l.id === params.id);

  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");
  const [showCallModal, setShowCallModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [note, setNote] = useState("");
  const [callResult, setCallResult] = useState<CallResult | "">("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [newStatus, setNewStatus] = useState<LeadStatus | "">("");

  const activities = lead ? getLeadActivities(lead.id) : [];

  if (!lead) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-asg-text">Lead not found</p>
        <Link href="/leads" className="mt-4 inline-block text-asg-gold-dark hover:text-asg-gold">Back to leads</Link>
      </div>
    );
  }

  const handleSaveCall = () => {
    if (!callResult) return;
    const now = new Date().toISOString();
    const statusMap: Record<CallResult, LeadStatus> = {
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

    updateLead({
      ...lead,
      status: statusMap[callResult],
      lastContactAt: now,
      updatedAt: now,
    });
    addActivity({
      id: `a-${Date.now()}`,
      leadId: lead.id,
      type: "Call Completed",
      description: `${currentUser.name} called. Result: ${callResult}`,
      createdAt: now,
      createdBy: currentUser.name,
    });
    setCallResult("");
    setShowCallModal(false);
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    const now = new Date().toISOString();
    addActivity({
      id: `a-${Date.now()}`,
      leadId: lead.id,
      type: "Note Added",
      description: note,
      createdAt: now,
      createdBy: currentUser.name,
    });
    updateLead({ ...lead, notes: note, updatedAt: now });
    setNote("");
    setShowNoteModal(false);
  };

  const handleSaveFollowUp = () => {
    if (!followUpDate || !followUpTime) return;
    const scheduledAt = new Date(`${followUpDate}T${followUpTime}`).toISOString();
    const now = new Date().toISOString();
    addActivity({
      id: `a-${Date.now()}`,
      leadId: lead.id,
      type: "Follow-up Scheduled",
      description: `Follow up scheduled for ${new Date(scheduledAt).toLocaleString("en-AU")}`,
      createdAt: now,
      createdBy: currentUser.name,
    });
    updateLead({ ...lead, nextFollowUpAt: scheduledAt, updatedAt: now });
    addFollowUp({
      id: `f-${Date.now()}`,
      leadId: lead.id,
      leadName: lead.name,
      assignedRep: lead.assignedRep,
      office: lead.office,
      scheduledAt,
      lastCallResult: lead.status as any,
      lastNote: lead.notes,
      status: "Pending",
    });
    setFollowUpDate("");
    setFollowUpTime("");
    setShowFollowUpModal(false);
  };

  const handleSaveStatus = () => {
    if (!newStatus) return;
    const now = new Date().toISOString();
    addActivity({
      id: `a-${Date.now()}`,
      leadId: lead.id,
      type: "Status Changed",
      description: `Status changed from ${lead.status} to ${newStatus}`,
      createdAt: now,
      createdBy: currentUser.name,
    });
    updateLead({ ...lead, status: newStatus, updatedAt: now });
    setNewStatus("");
    setShowStatusModal(false);
  };

  return (
    <div className="animate-fade-in">
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm font-medium text-asg-text-secondary hover:text-asg-gold-dark">
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      <div className="mt-4 rounded-xl border border-asg-border bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-asg-text">{lead.name}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <p className="mt-1 text-sm text-asg-text-muted">{lead.leadId} · {lead.source}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${lead.mobile.replace(/\s/g, "")}`} className="asg-button-primary">
              <Phone className="h-4 w-4" />
              Call
            </a>
            <button onClick={() => setShowNoteModal(true)} className="asg-button-secondary">
              <MessageSquare className="h-4 w-4" />
              Note
            </button>
            <button onClick={() => setShowFollowUpModal(true)} className="asg-button-secondary">
              <Calendar className="h-4 w-4" />
              Follow Up
            </button>
            <button onClick={() => setShowStatusModal(true)} className="asg-button-secondary">
              <RotateCcw className="h-4 w-4" />
              Status
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-asg-border bg-asg-cream/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-asg-text-secondary">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-asg-text-muted">Mobile</p>
                  <a href={`tel:${lead.mobile.replace(/\s/g, "")}`} className="mt-1 flex items-center gap-2 text-base font-medium text-asg-text hover:text-asg-gold-dark">
                    <Phone className="h-4 w-4 text-asg-gold" /> {lead.mobile}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-asg-text-muted">Address</p>
                  <p className="mt-1 flex items-start gap-2 text-base text-asg-text">
                    <MapPin className="mt-0.5 h-4 w-4 text-asg-gold" />
                    {lead.address}, {lead.suburb}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-asg-border bg-asg-cream/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-asg-text-secondary">Lead Information</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-asg-text-muted">Source</p>
                  <p className="mt-1 text-base text-asg-text">{lead.source}</p>
                </div>
                <div>
                  <p className="text-xs text-asg-text-muted">Date Created</p>
                  <p className="mt-1 text-base text-asg-text">{new Date(lead.createdAt).toLocaleDateString("en-AU")}</p>
                </div>
                {lead.renterOwner && (
                  <div>
                    <p className="text-xs text-asg-text-muted">Housing</p>
                    <p className="mt-1 text-base text-asg-text">{lead.renterOwner}</p>
                  </div>
                )}
                {lead.employmentStatus && (
                  <div>
                    <p className="text-xs text-asg-text-muted">Employment</p>
                    <p className="mt-1 text-base text-asg-text">{lead.employmentStatus}</p>
                  </div>
                )}
                {lead.superannuation && (
                  <div>
                    <p className="text-xs text-asg-text-muted">Superannuation</p>
                    <p className="mt-1 text-base text-asg-text">{lead.superannuation}</p>
                  </div>
                )}
                {lead.costOfLivingResponse && (
                  <div>
                    <p className="text-xs text-asg-text-muted">Cost of Living Increased?</p>
                    <p className="mt-1 text-base text-asg-text">{lead.costOfLivingResponse}</p>
                  </div>
                )}
                {lead.taxResponse && (
                  <div>
                    <p className="text-xs text-asg-text-muted">Too Much Tax?</p>
                    <p className="mt-1 text-base text-asg-text">{lead.taxResponse}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex gap-6 border-b border-asg-border">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "border-b-2 pb-3 text-sm font-medium transition-colors",
                    activeTab === "overview" ? "border-asg-gold text-asg-gold-dark" : "border-transparent text-asg-text-secondary hover:text-asg-text"
                  )}
                >
                  Notes
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={cn(
                    "border-b-2 pb-3 text-sm font-medium transition-colors",
                    activeTab === "activity" ? "border-asg-gold text-asg-gold-dark" : "border-transparent text-asg-text-secondary hover:text-asg-text"
                  )}
                >
                  Activity Timeline
                </button>
              </div>

              <div className="mt-5">
                {activeTab === "overview" ? (
                  <div className="rounded-lg border border-asg-border bg-white p-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-asg-text-secondary">
                      {lead.notes || "No notes recorded yet."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <p className="text-sm text-asg-text-secondary">No activity recorded yet.</p>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="relative pl-6">
                          <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-asg-gold bg-white" />
                          <div className="absolute left-[4px] top-4 h-full w-px bg-asg-border" />
                          <p className="text-xs font-medium text-asg-text-muted">
                            {new Date(activity.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-asg-text">{activity.type}</p>
                          <p className="text-sm text-asg-text-secondary">{activity.description}</p>
                          <p className="mt-1 text-xs text-asg-text-muted">by {activity.createdBy}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-asg-border bg-asg-cream/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-asg-text-secondary">Assignment</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-asg-gold" />
                  <div>
                    <p className="text-xs text-asg-text-muted">Assigned Rep</p>
                    <p className="text-sm font-medium text-asg-text">{lead.assignedRep}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-asg-gold" />
                  <div>
                    <p className="text-xs text-asg-text-muted">Office</p>
                    <p className="text-sm font-medium text-asg-text">{lead.office}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-asg-gold" />
                  <div>
                    <p className="text-xs text-asg-text-muted">Last Contact</p>
                    <p className="text-sm font-medium text-asg-text">
                      {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Never"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-asg-gold" />
                  <div>
                    <p className="text-xs text-asg-text-muted">Next Follow Up</p>
                    <p className="text-sm font-medium text-asg-text">
                      {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "None"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCallModal && (
        <Modal title="Log Call Result" onClose={() => setShowCallModal(false)}>
          <div className="grid grid-cols-2 gap-2">
            {callResults.map((r) => (
              <button
                key={r}
                onClick={() => setCallResult(r)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  callResult === r ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark" : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowCallModal(false)} className="asg-button-secondary">Cancel</button>
            <button onClick={handleSaveCall} disabled={!callResult} className="asg-button-primary">Save Result</button>
          </div>
        </Modal>
      )}

      {showNoteModal && (
        <Modal title="Add Note" onClose={() => setShowNoteModal(false)}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="asg-textarea" placeholder="Enter your note..." />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowNoteModal(false)} className="asg-button-secondary">Cancel</button>
            <button onClick={handleSaveNote} disabled={!note.trim()} className="asg-button-primary">Save Note</button>
          </div>
        </Modal>
      )}

      {showFollowUpModal && (
        <Modal title="Schedule Follow Up" onClose={() => setShowFollowUpModal(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-asg-text">Date</label>
              <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="asg-input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-asg-text">Time</label>
              <input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} className="asg-input mt-1" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowFollowUpModal(false)} className="asg-button-secondary">Cancel</button>
            <button onClick={handleSaveFollowUp} disabled={!followUpDate || !followUpTime} className="asg-button-primary">Schedule</button>
          </div>
        </Modal>
      )}

      {showStatusModal && (
        <Modal title="Change Status" onClose={() => setShowStatusModal(false)}>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setNewStatus(s)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  newStatus === s ? "border-asg-gold bg-asg-gold-subtle text-asg-gold-dark" : "border-asg-border bg-white text-asg-text hover:border-asg-gold"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowStatusModal(false)} className="asg-button-secondary">Cancel</button>
            <button onClick={handleSaveStatus} disabled={!newStatus} className="asg-button-primary">Change Status</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-asg-border bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-asg-text">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
