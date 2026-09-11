"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { MetricCard } from "@/components/metric-card";
import { TrendingUp, Users, Home, Briefcase, PiggyBank } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#C8A968", "#111C32", "#2F7A4A", "#B07D2B", "#2C5F7C", "#A53A3A"];

export default function SurveyAnalyticsPage() {
  const { surveySessions, selectedOffice } = useApp();

  const filtered = useMemo(() => {
    if (selectedOffice === "All") return surveySessions;
    return surveySessions.filter((s) => s.office === selectedOffice);
  }, [surveySessions, selectedOffice]);

  const totalRespondents = filtered.reduce((sum, s) => sum + s.respondents, 0);
  const totalLeads = filtered.reduce((sum, s) => sum + s.leadsCaptured, 0);

  const officeData = [
    { name: "Perth", value: surveySessions.filter((s) => s.office === "Perth").reduce((sum, s) => sum + s.respondents, 0) },
    { name: "Brisbane", value: surveySessions.filter((s) => s.office === "Brisbane").reduce((sum, s) => sum + s.respondents, 0) },
  ].filter((d) => d.value > 0);

  const repData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => map.set(s.rep, (map.get(s.rep) || 0) + s.respondents));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  return (
    <div className="animate-fade-in">
      <div className="border-b border-asg-border pb-6">
        <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Survey Analytics</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">Community Awareness Survey insights and breakdowns.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Total Respondents" value={totalRespondents} accent="navy" />
        <MetricCard icon={TrendingUp} label="Leads Captured" value={totalLeads} accent="gold" />
        <MetricCard icon={Home} label="Conversion Rate" value={`${totalRespondents ? Math.round((totalLeads / totalRespondents) * 100) : 0}%`} accent="success" />
        <MetricCard icon={PiggyBank} label="Avg Respondents / Session" value={filtered.length ? Math.round(totalRespondents / filtered.length) : 0} accent="gold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="asg-card p-5">
          <h2 className="font-semibold text-asg-text">Survey Responses by Office</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={officeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {officeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4">
            {officeData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-sm text-asg-text-secondary">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>

        <div className="asg-card p-5">
          <h2 className="font-semibold text-asg-text">Respondents by Rep</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#C8A968" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard label="Cost of Living Increased" value="81%" icon={TrendingUp} />
        <InsightCard label="Pay Too Much Tax" value="67%" icon={Briefcase} />
        <InsightCard label="Don't Know Super Balance" value="52%" icon={PiggyBank} />
        <InsightCard label="Renters" value="44%" icon={Home} />
        <InsightCard label="Owners" value="56%" icon={Home} />
      </div>
    </div>
  );
}

function InsightCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="asg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-asg-gold-subtle">
          <Icon className="h-5 w-5 text-asg-gold-dark" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-asg-text">{value}</p>
          <p className="text-sm text-asg-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}
