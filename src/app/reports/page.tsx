"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { MetricCard } from "@/components/metric-card";
import { repPerformance } from "@/lib/mock-data";
import { Phone, Users, Calendar, TrendingUp, ArrowDownToLine } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export default function ReportsPage() {
  const { leads, selectedOffice } = useApp();
  const [range, setRange] = useState("week");

  const officeLeads = useMemo(() => {
    if (selectedOffice === "All") return leads;
    return leads.filter((l) => l.office === selectedOffice);
  }, [leads, selectedOffice]);

  const sourceData = useMemo(() => {
    const map = new Map<string, number>();
    officeLeads.forEach((l) => map.set(l.source, (map.get(l.source) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [officeLeads]);

  const conversionData = [
    { name: "Mon", calls: 24, contacts: 10, bookings: 2 },
    { name: "Tue", calls: 32, contacts: 14, bookings: 3 },
    { name: "Wed", calls: 28, contacts: 11, bookings: 1 },
    { name: "Thu", calls: 35, contacts: 16, bookings: 4 },
    { name: "Fri", calls: 30, contacts: 13, bookings: 2 },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Office and organisation-wide performance reporting.</p>
        </div>
        <div className="flex gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="asg-select">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          <button className="asg-button-secondary">
            <ArrowDownToLine className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Phone} label="Total Calls" value={149} accent="navy" />
        <MetricCard icon={Users} label="Contacts" value={58} accent="gold" />
        <MetricCard icon={Calendar} label="Bookings" value={14} accent="success" />
        <MetricCard icon={TrendingUp} label="Contact Rate" value="39%" accent="gold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="asg-card p-5">
          <h2 className="font-semibold text-asg-text">Calls, Contacts & Bookings</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DF" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="calls" stroke="#111C32" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="contacts" stroke="#C8A968" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bookings" stroke="#2F7A4A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="asg-card p-5">
          <h2 className="font-semibold text-asg-text">Lead Source Breakdown</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#C8A968" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 asg-card overflow-hidden">
        <div className="border-b border-asg-border px-5 py-4">
          <h2 className="font-semibold text-asg-text">Rep Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="asg-table min-w-[600px]">
            <thead>
              <tr>
                <th>Rep</th>
                <th>Calls</th>
                <th>Contacts</th>
                <th>Contact Rate</th>
                <th>Qualified</th>
                <th>Bookings</th>
                <th>Booking Rate</th>
                <th>Follow Ups Done</th>
              </tr>
            </thead>
            <tbody>
              {repPerformance.map((rep) => (
                <tr key={rep.name}>
                  <td className="font-medium text-asg-text">{rep.name}</td>
                  <td>{rep.calls}</td>
                  <td>{rep.contacts}</td>
                  <td>{Math.round((rep.contacts / rep.calls) * 100)}%</td>
                  <td>{rep.qualified}</td>
                  <td>{rep.bookings}</td>
                  <td>{Math.round((rep.bookings / rep.calls) * 100)}%</td>
                  <td>{rep.followUpsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
