"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { BrandLogo } from "@/components/brand-logo";
import {
  LayoutDashboard,
  Users,
  Phone,
  ClipboardList,
  Upload,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
  ChevronDown,
  LogOut,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  admin?: boolean;
  manager?: boolean;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Calling", href: "/calling", icon: Phone },
  { name: "Surveys", href: "/surveys/new", icon: ClipboardList },
  { name: "Imports", href: "/imports", icon: Upload, manager: true },
  { name: "Reports", href: "/reports", icon: BarChart3, manager: true },
  { name: "Admin", href: "/admin/users", icon: Settings, admin: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const { profile, getDefaultOffice, signOut } = useAuth();
  const { selectedOffice, setSelectedOffice } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  // Filter nav items based on role
  const visibleNavItems = navItems.filter((item) => {
    if (item.admin) return profile?.role === "admin";
    if (item.manager) return profile?.role === "manager" || profile?.role === "admin";
    return true;
  });

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-asg-border bg-asg-navy px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <BrandLogo className="w-32 shrink-0" />
          <span className="text-sm font-semibold text-white">ASG Leads</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-asg-navy shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-2">
                <BrandLogo className="w-32" />
                <span className="text-sm font-semibold text-white">Menu</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {profile?.role === "admin" && (
              <div className="border-b border-white/10 px-4 py-3">
                <label className="text-[10px] uppercase tracking-[0.12em] text-white/50">Office</label>
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-asg-gold" />
                  <select
                    value={selectedOffice}
                    onChange={(e) => setSelectedOffice(e.target.value as any)}
                    className="w-full appearance-none rounded-md border border-white/10 bg-asg-navy-light py-2 pl-9 pr-8 text-sm text-white focus:border-asg-gold focus:outline-none"
                  >
                    {["All", "Perth", "Brisbane"].map((office) => (
                      <option key={office} value={office}>
                        {office === "All" ? "All Offices" : office}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-white/50" />
                </div>
              </div>
            )}

            <nav className="p-3">
              <ul className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href);

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                          active ? "bg-asg-gold/10 text-asg-gold" : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
              <div className="mb-3 flex items-center gap-3 px-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-asg-gold text-xs font-semibold text-asg-navy">
                  {profile?.displayName?.split(" ").map((n) => n[0]).join("") ?? "?"}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{profile?.displayName ?? "Loading..."}</span>
                  <span className="text-xs text-white/50">{profile?.role ?? ""}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-asg-border bg-asg-navy lg:hidden">
        {[
          { name: "Home", href: "/dashboard", icon: LayoutDashboard },
          { name: "Leads", href: "/leads", icon: Users },
          { name: "Call", href: "/calling", icon: Phone },
          { name: "Survey", href: "/surveys/new", icon: ClipboardList },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors",
                active ? "text-asg-gold" : "text-white/50"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </>
  );
}
