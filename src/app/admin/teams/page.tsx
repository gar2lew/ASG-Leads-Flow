"use client";

import { Users, Building2, UserCheck } from "lucide-react";

const teams = [
  { name: "Perth Sales Team", office: "Perth", members: 4, lead: "Josh Parker" },
  { name: "Brisbane Sales Team", office: "Brisbane", members: 3, lead: "Mia Chen" },
  { name: "Field Survey Team", office: "Perth", members: 2, lead: "Cody Williams" },
];

export default function TeamsPage() {
  return (
    <div className="animate-fade-in">
      <div className="border-b border-asg-border pb-6">
        <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Teams</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">Organise reps and managers into office teams.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div key={team.name} className="asg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-asg-gold-subtle">
                <Users className="h-5 w-5 text-asg-gold-dark" />
              </div>
              <div>
                <h2 className="font-semibold text-asg-text">{team.name}</h2>
                <p className="text-sm text-asg-text-secondary">{team.office}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-asg-text-secondary">
              <p className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-asg-gold" /> Team Lead: {team.lead}</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-asg-gold" /> {team.members} members</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
