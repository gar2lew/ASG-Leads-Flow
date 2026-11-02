// ============================================
// ASG Leads — Dashboard Client Component
// ============================================

"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Phone, Calendar, Users, ClipboardList, ArrowRight, Clock, TrendingUp, Building2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardData {
  metrics: {
    myLeads: number;
    leadsToCall: number;
    followUpsDue: number;
    newLeads: number;
    bookedLeads: number;
    officeLeadCounts: { perth: number; brisbane: number };
  };
  recentLeads: Array<{
    leadId: string;
    name: string;
    mobile: string;
    suburb: string | null;
    source: string;
    status: string;
    assignedRepId: string | null;
    assignedRepName?: string | null;
    createdAt: string;
  }>;
  upcomingCallbacks: Array<{
    followUpId: string;
    leadId: string;
    officeId: string;
    scheduledAt: string;
    status: string;
    leadName?: string | null;
    assignedRepId?: string | null;
    assignedRepName?: string | null;
    reason?: string | null;
    lastCallResult?: string | null;
    lastNote?: string | null;
    createdAt: string;
  }>;
}

export default function DashboardClient() {
  const { profile, isAdmin, isManager, isRep } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [office, setOffice] = useState<string>(profile?.primaryOfficeId ?? "perth");

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (!isRep) {
        params.set("office", office);
      }
      const response = await fetch(`/api/dashboard?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [office, isRep]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="h-10 w-10 animate-spin text-asg-gold" />
        <p className="mt-4 text-asg-text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-asg-danger-subtle">
          <AlertCircle className="h-7 w-7 text-asg-danger" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-asg-text">Dashboard Error</h1>
        <p className="mt-2 text-sm text-asg-text-secondary">{error}</p>
        <button onClick={fetchDashboardData} className="mt-4 asg-button-primary">Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-asg-text">No data available</p>
      </div>
    );
  }

  const { metrics, recentLeads, upcomingCallbacks } = data;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-asg-text-muted">
            {new Date().toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-asg-text lg:text-3xl">
            Good morning, {profile?.displayName?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-asg-text-secondary">
            <Building2 className="h-4 w-4" />
            {isRep ? (
              <>{profile?.primaryOfficeId === "perth" ? "Perth" : "Brisbane"}</>
            ) : (
              <>{office === "perth" ? "Perth" : "Brisbane"}</>
            )}{" "}
            · {profile?.role ?? ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/calling" className="asg-button-primary">
            <Phone className="h-4 w-4" />
            Start Calling
          </Link>
          <Link href="/surveys/new" className="asg-button-secondary">
            <ClipboardList className="h-4 w-4" />
            New Survey
          </Link>
        </div>
      </div>

      {isRep && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Phone} label="Leads To Call" value={metrics.leadsToCall} accent="navy" />
            <MetricCard icon={Clock} label="Follow Ups Due" value={metrics.followUpsDue} accent="gold" />
            <MetricCard icon={Users} label="New Leads" value={metrics.newLeads} accent="success" />
            <MetricCard icon={Calendar} label="Appointments Booked" value={metrics.bookedLeads} accent="gold" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="asg-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-asg-border px-5 py-4">
                <h2 className="font-semibold text-asg-text">Leads Requiring Action</h2>
                <Link href="/leads" className="flex items-center gap-1 text-sm font-medium text-asg-gold-dark hover:text-asg-gold">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="divide-y divide-asg-border">
                {recentLeads.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-asg-text-secondary">No leads requiring action.</p>
                ) : (
                  recentLeads.map((lead) => (
                    <Link key={lead.leadId} href={`/leads/${lead.leadId}`} className="flex items-center justify-between px-5 py-4 hover:bg-asg-cream/50">
                      <div>
                        <p className="font-medium text-asg-text">{lead.name}</p>
                        <p className="text-sm text-asg-text-secondary">
                          {lead.mobile} · {lead.suburb}
                        </p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="asg-card">
              <div className="border-b border-asg-border px-5 py-4">
                <h2 className="font-semibold text-asg-text">Upcoming Callbacks</h2>
              </div>
              <div className="divide-y divide-asg-border">
                {upcomingCallbacks.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-asg-text-secondary">No callbacks scheduled.</p>
                ) : (
                  upcomingCallbacks.map((fu) => (
                    <div key={fu.followUpId} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="font-medium text-asg-text">{fu.leadName ?? fu.leadId}</p>
                        <p className="text-sm text-asg-text-secondary">
                          {new Date(fu.scheduledAt).toLocaleString("en-AU", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Phone className="h-4 w-4 text-asg-gold-dark" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {(isManager || isAdmin) && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Users} label="Total Leads" value={metrics.officeLeadCounts.perth + metrics.officeLeadCounts.brisbane} accent="navy" />
            <MetricCard icon={Calendar} label="Bookings This Week" value={metrics.bookedLeads} accent="gold" />
            <MetricCard icon={Clock} label="Follow Ups Due" value={metrics.followUpsDue} accent="gold" />
            <MetricCard icon={TrendingUp} label="New Leads" value={metrics.newLeads} accent="success" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="asg-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-asg-border px-5 py-4">
                <h2 className="font-semibold text-asg-text">Recent Lead Activity</h2>
                <Link href="/leads" className="flex items-center gap-1 text-sm font-medium text-asg-gold-dark hover:text-asg-gold">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="divide-y divide-asg-border">
                {recentLeads.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-asg-text-secondary">No recent lead activity.</p>
                ) : (
                  recentLeads.map((lead) => (
                    <Link key={lead.leadId} href={`/leads/${lead.leadId}`} className="flex items-center justify-between px-5 py-4 hover:bg-asg-cream/50">
                      <div>
                        <p className="font-medium text-asg-text">{lead.name}</p>
                        <p className="text-sm text-asg-text-secondary">
                          {lead.assignedRepName ?? lead.assignedRepId ?? "—"}
                        </p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="asg-card">
              <div className="border-b border-asg-border px-5 py-4">
                <h2 className="font-semibold text-asg-text">Follow Ups Due</h2>
              </div>
              <div className="divide-y divide-asg-border">
                {upcomingCallbacks.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-asg-text-secondary">No follow-ups due.</p>
                ) : (
                  upcomingCallbacks.map((fu) => (
                    <div key={fu.followUpId} className="px-5 py-4">
                      <p className="font-medium text-asg-text">{fu.leadName ?? fu.leadId}</p>
                      <p className="text-sm text-asg-text-secondary">{fu.assignedRepName ?? fu.assignedRepId ?? "—"}</p>
                      <p className="text-sm text-xs text-asg-text-muted">
                        {new Date(fu.scheduledAt).toLocaleString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-6 asg-card p-6">
              <h2 className="font-semibold text-asg-text">Organisation Overview</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-asg-border bg-asg-cream p-4">
                  <p className="text-sm text-asg-text-muted">Perth Office</p>
                  <p className="mt-1 text-2xl font-semibold text-asg-text">{metrics.officeLeadCounts.perth} leads</p>
                </div>
                <div className="rounded-lg border border-asg-border bg-asg-cream p-4">
                  <p className="text-sm text-asg-text-muted">Brisbane Office</p>
                  <p className="mt-1 text-2xl font-semibold text-asg-text">{metrics.officeLeadCounts.brisbane} leads</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}