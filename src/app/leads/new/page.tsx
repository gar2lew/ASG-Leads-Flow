"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { LeadSource } from "@/lib/types";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewLeadPage() {
  const router = useRouter();
  const { currentUser, addLead, addActivity } = useApp();
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    address: "",
    suburb: "",
    source: "Manual Entry",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const lead = {
      id: `l-${Date.now()}`,
      leadId: `ASG-2026-${1000 + Math.floor(Math.random() * 9000)}`,
      ...form,
      source: form.source as LeadSource,
      office: currentUser.office === "All" ? "Perth" : (currentUser.office as "Perth" | "Brisbane"),
      assignedRep: currentUser.name,
      status: "New" as const,
      createdAt: now,
      updatedAt: now,
    };
    addLead(lead);
    addActivity({
      id: `a-${Date.now()}`,
      leadId: lead.id,
      type: "Lead Created",
      description: "Lead manually entered",
      createdAt: now,
      createdBy: currentUser.name,
    });
    router.push("/leads");
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm font-medium text-asg-text-secondary hover:text-asg-gold-dark">
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-asg-text">Add New Lead</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border border-asg-border bg-white p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-asg-text">Full Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="asg-input mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-asg-text">Mobile</label>
            <input required type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="asg-input mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-asg-text">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="asg-input mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-asg-text">Suburb</label>
            <input value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} className="asg-input mt-1" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-asg-text">Lead Source</label>
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="asg-select mt-1">
            <option>Manual Entry</option>
            <option>Referral</option>
            <option>Marketing Campaign</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-asg-text">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="asg-textarea mt-1" rows={4} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/leads" className="asg-button-secondary">Cancel</Link>
          <button type="submit" className="asg-button-primary">
            <Save className="h-4 w-4" />
            Save Lead
          </button>
        </div>
      </form>
    </div>
  );
}
