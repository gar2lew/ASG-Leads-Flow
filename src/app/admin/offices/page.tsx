"use client";

import { Building2, MapPin, Users, Phone } from "lucide-react";
import { useApp } from "@/lib/store";

const offices = [
  { name: "Perth", address: "123 St Georges Terrace, Perth WA 6000", phone: "08 9000 0000", reps: 4 },
  { name: "Brisbane", address: "456 Queen Street, Brisbane QLD 4000", phone: "07 3000 0000", reps: 3 },
];

export default function OfficesPage() {
  const { leads } = useApp();

  return (
    <div className="animate-fade-in">
      <div className="border-b border-asg-border pb-6">
        <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Offices</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">Manage office locations and settings.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {offices.map((office) => {
          const leadCount = leads.filter((l) => l.office === office.name).length;
          return (
            <div key={office.name} className="asg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-asg-navy/10">
                  <Building2 className="h-6 w-6 text-asg-navy" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-asg-text">{office.name}</h2>
                  <p className="text-sm text-asg-text-secondary">{office.address}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-asg-border pt-4 text-center">
                <div>
                  <p className="text-xl font-semibold text-asg-text">{leadCount}</p>
                  <p className="text-xs text-asg-text-muted">Leads</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-asg-text">{office.reps}</p>
                  <p className="text-xs text-asg-text-muted">Reps</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-asg-text">1</p>
                  <p className="text-xs text-asg-text-muted">Manager</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-asg-text-secondary">
                <Phone className="h-4 w-4 text-asg-gold" /> {office.phone}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
