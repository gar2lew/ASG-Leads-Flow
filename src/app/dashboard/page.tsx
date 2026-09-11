"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Phone, Calendar, Users, ClipboardList, ArrowRight, Clock, TrendingUp, Building2 } from "lucide-react";

export default function DashboardPage() {
  const { currentUser, getOfficeLeads, getRepLeads, followUps, selectedOffice } = useApp();

  const isAdmin = currentUser.role === "Admin";
  const isManager = currentUser.role === "Manager";
  const isRep = currentUser.role === "Rep";

  const officeLeads = getOfficeLeads();
  const myLeads = isRep ? getRepLeads(currentUser.name) : officeLeads;

  const leadsToCall = myLeads.filter((l) => ["New", "No Answer", "Callback", "Contacted"].includes(l.status)).length;
  const followUpsDue = followUps.filter((f) => f.assignedRep === currentUser.name && f.status === "Pending").length;
  const newLeads = myLeads.filter((l) => l.status === "New").length;
  const bookedAppointments = myLeads.filter((l) => l.status === "Booked").length;

  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const recentLeads = officeLeads.slice(0, 5);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-asg-text-muted">{today}</p>
          <h1 className="mt-1 text-2xl font-semibold text-asg-text lg:text-3xl">
            Good morning, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-asg-text-secondary">
            <Building2 className="h-4 w-4" />
            {selectedOffice === "All" ? "All Offices" : selectedOffice} · {currentUser.role}
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
            <MetricCard icon={Phone} label="Leads To Call" value={leadsToCall} accent="navy" />
            <MetricCard icon={Clock} label="Follow Ups Due" value={followUpsDue} accent="gold" />
            <MetricCard icon={Users} label="New Leads" value={newLeads} accent="success" />
            <MetricCard icon={Calendar} label="Appointments Booked" value={bookedAppointments} accent="gold" />
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
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-asg-cream/50">
                      <div>
                        <p className="font-medium text-asg-text">{lead.name}</p>
                        <p className="text-sm text-asg-text-secondary">{lead.mobile} · {lead.suburb}</p>
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
                {followUps.filter((f) => f.assignedRep === currentUser.name).length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-asg-text-secondary">No callbacks scheduled.</p>
                ) : (
                  followUps
                    .filter((f) => f.assignedRep === currentUser.name)
                    .slice(0, 4)
                    .map((fu) => (
                      <div key={fu.id} className="px-5 py-4">
                        <p className="font-medium text-asg-text">{fu.leadName}</p>
                        <p className="text-sm text-asg-text-secondary">
                          {new Date(fu.scheduledAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        </p>
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
            <MetricCard icon={Users} label="Total Leads" value={officeLeads.length} trend="12% this month" trendUp accent="navy" />
            <MetricCard icon={Phone} label="Calls Made Today" value={isManager ? 94 : 0} trend="8% vs yesterday" trendUp accent="gold" />
            <MetricCard icon={TrendingUp} label="Contact Rate" value={isManager ? "39%" : "0%"} trend="3% this week" trendUp accent="success" />
            <MetricCard icon={Calendar} label="Bookings This Week" value={isManager ? 14 : 0} accent="gold" />
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
                {recentLeads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-asg-cream/50">
                    <div>
                      <p className="font-medium text-asg-text">{lead.name}</p>
                      <p className="text-sm text-asg-text-secondary">{lead.source} · {lead.assignedRep}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </Link>
                ))}
              </div>
            </div>

            <div className="asg-card">
              <div className="border-b border-asg-border px-5 py-4">
                <h2 className="font-semibold text-asg-text">Follow Ups Due</h2>
              </div>
              <div className="divide-y divide-asg-border">
                {followUps.slice(0, 5).map((fu) => (
                  <div key={fu.id} className="px-5 py-4">
                    <p className="font-medium text-asg-text">{fu.leadName}</p>
                    <p className="text-sm text-asg-text-secondary">{fu.assignedRep}</p>
                    <p className="mt-1 text-xs text-asg-text-muted">
                      {new Date(fu.scheduledAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-6 asg-card p-6">
              <h2 className="font-semibold text-asg-text">Organisation Overview</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-asg-border bg-asg-cream p-4">
                  <p className="text-sm text-asg-text-muted">Perth Office</p>
                  <p className="mt-1 text-2xl font-semibold text-asg-text">{getOfficeLeads("Perth").length} leads</p>
                </div>
                <div className="rounded-lg border border-asg-border bg-asg-cream p-4">
                  <p className="text-sm text-asg-text-muted">Brisbane Office</p>
                  <p className="mt-1 text-2xl font-semibold text-asg-text">{getOfficeLeads("Brisbane").length} leads</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
