"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import {
  LayoutDashboard,
  Users,
  Phone,
  ClipboardList,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Leads",
    icon: Users,
    children: [
      { name: "My Leads", href: "/leads?view=my" },
      { name: "All Leads", href: "/leads" },
      { name: "New Leads", href: "/leads?status=New" },
      { name: "Follow Ups", href: "/follow-ups" },
      { name: "Booked", href: "/leads?status=Booked" },
    ],
  },
  { name: "Calling", href: "/calling", icon: Phone },
  {
    name: "Surveys",
    icon: ClipboardList,
    children: [
      { name: "New Survey", href: "/surveys/new" },
      { name: "Survey History", href: "/surveys/history" },
      { name: "Survey Analytics", href: "/surveys/analytics" },
    ],
  },
  {
    name: "Imports",
    icon: Upload,
    children: [
      { name: "Import Leads", href: "/imports" },
      { name: "Import History", href: "/imports/history" },
    ],
  },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  {
    name: "Administration",
    icon: Settings,
    admin: true,
    children: [
      { name: "Users", href: "/admin/users" },
      { name: "Teams", href: "/admin/teams" },
      { name: "Offices", href: "/admin/offices" },
      { name: "Settings", href: "/admin/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, selectedOffice, setSelectedOffice, logout } = useApp();
  const [openSections, setOpenSections] = useState<string[]>(["Leads", "Surveys"]);

  const canAccessAdmin = currentUser.role === "Admin" || currentUser.role === "Manager";

  const toggleSection = (name: string) => {
    setOpenSections((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const isActive = (href: string) => {
    if (href === "/leads") return pathname === "/leads";
    return pathname.startsWith(href.split("?")[0]);
  };

  const officeOptions = currentUser.role === "Admin" ? ["All", "Perth", "Brisbane"] : [currentUser.office];

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-asg-border bg-asg-navy lg:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight text-white">ASG Leads</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-asg-gold">Amplify Solutions Group</span>
        </div>
      </div>

      {currentUser.role === "Admin" && (
        <div className="border-b border-white/10 px-4 py-3">
          <label className="text-[10px] uppercase tracking-[0.12em] text-white/50">Office</label>
          <div className="relative mt-1.5">
            <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-asg-gold" />
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value as any)}
              className="w-full appearance-none rounded-md border border-white/10 bg-asg-navy-light py-2 pl-9 pr-8 text-sm text-white focus:border-asg-gold focus:outline-none"
            >
              {officeOptions.map((office) => (
                <option key={office} value={office}>
                  {office === "All" ? "All Offices" : office}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-white/50" />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            if (item.admin && !canAccessAdmin) return null;
            const Icon = item.icon;

            if (item.children) {
              const isOpen = openSections.includes(item.name);
              const hasActiveChild = item.children.some((child) => isActive(child.href));

              return (
                <li key={item.name}>
                  <button
                    onClick={() => toggleSection(item.name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      hasActiveChild ? "bg-asg-gold/10 text-asg-gold" : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "")}
                    />
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-0.5 pl-10">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={cn(
                              "block rounded-md px-3 py-1.5 text-sm transition-colors",
                              isActive(child.href)
                                ? "bg-asg-gold/10 text-asg-gold"
                                : "text-white/60 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-asg-gold/10 text-asg-gold"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-asg-gold text-xs font-semibold text-asg-navy">
            {currentUser.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-white">{currentUser.name}</span>
            <span className="truncate text-xs text-white/50">{currentUser.role}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
