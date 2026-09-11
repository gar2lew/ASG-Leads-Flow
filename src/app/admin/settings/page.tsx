"use client";

import { useState } from "react";
import { Tag, Building2, Users, ClipboardList, Upload, FileSpreadsheet, Shield, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "statuses", label: "Lead Statuses", icon: Tag },
  { id: "sources", label: "Lead Sources", icon: Building2 },
  { id: "teams", label: "Teams", icon: Users },
  { id: "survey", label: "Survey Questions", icon: ClipboardList },
  { id: "import", label: "Import Rules", icon: Upload },
  { id: "sheets", label: "Google Sheets Sync", icon: FileSpreadsheet },
  { id: "permissions", label: "Permissions", icon: Shield },
];

const leadStatuses = ["New", "No Answer", "Callback", "Contacted", "Interested", "Qualified", "Booked", "Revisit", "Not Interested", "Disqualified", "Wrong Number"];
const leadSources = ["Community Survey", "CSV Import", "Spreadsheet Import", "Marketing Campaign", "Manual Entry", "Referral"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("statuses");

  return (
    <div className="animate-fade-in">
      <div className="border-b border-asg-border pb-6">
        <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">Configure system settings, statuses and integrations.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id ? "bg-asg-navy text-white" : "text-asg-text-secondary hover:bg-asg-cream hover:text-asg-text"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="asg-card p-5">
          {activeTab === "statuses" && (
            <div>
              <h2 className="font-semibold text-asg-text">Lead Statuses</h2>
              <p className="text-sm text-asg-text-secondary">Active lead statuses used across the platform.</p>
              <div className="mt-4 space-y-2">
                {leadStatuses.map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-lg border border-asg-border px-4 py-3">
                    <span className="text-sm font-medium text-asg-text">{status}</span>
                    <span className="text-xs text-asg-text-muted">System</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "sources" && (
            <div>
              <h2 className="font-semibold text-asg-text">Lead Sources</h2>
              <p className="text-sm text-asg-text-secondary">Where your leads originate.</p>
              <div className="mt-4 space-y-2">
                {leadSources.map((source) => (
                  <div key={source} className="flex items-center justify-between rounded-lg border border-asg-border px-4 py-3">
                    <span className="text-sm font-medium text-asg-text">{source}</span>
                    <span className="text-xs text-asg-text-muted">Active</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "survey" && (
            <div>
              <h2 className="font-semibold text-asg-text">Survey Questions</h2>
              <p className="text-sm text-asg-text-secondary">Community Awareness Survey question configuration.</p>
              <div className="mt-4 space-y-3">
                {[
                  "Has the cost of living increased recently?",
                  "Do you think you are paying too much tax?",
                  "Housing",
                  "Employment",
                  "Superannuation",
                ].map((q, i) => (
                  <div key={i} className="rounded-lg border border-asg-border p-4">
                    <p className="text-sm font-medium text-asg-text">{q}</p>
                    <p className="text-xs text-asg-text-muted">Type: Segmented control</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "sheets" && (
            <div>
              <h2 className="font-semibold text-asg-text">Google Sheets Sync</h2>
              <p className="text-sm text-asg-text-secondary">Synchronise lead records with existing workbooks.</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-asg-border p-4">
                  <p className="font-medium text-asg-text">Perth Workbook</p>
                  <p className="text-sm text-asg-text-secondary">ASG - Live Leads 2026 - PERTH</p>
                  <p className="mt-1 text-xs text-asg-success">● Sync enabled</p>
                </div>
                <div className="rounded-lg border border-asg-border p-4">
                  <p className="font-medium text-asg-text">Brisbane Workbook</p>
                  <p className="text-sm text-asg-text-secondary">ASG - Live Leads 2026 (BRISBANE)</p>
                  <p className="mt-1 text-xs text-asg-success">● Sync enabled</p>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "teams" || activeTab === "import" || activeTab === "permissions") && (
            <div>
              <h2 className="font-semibold text-asg-text">
                {activeTab === "teams" && "Teams"}
                {activeTab === "import" && "Import Rules"}
                {activeTab === "permissions" && "Permissions"}
              </h2>
              <p className="text-sm text-asg-text-secondary">Configuration options for this section will appear here.</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button className="asg-button-primary">
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
