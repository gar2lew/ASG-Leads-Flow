"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { useApp } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-asg-cream">
      <Sidebar />
      <MobileNav />
      <main className="min-h-screen pt-14 lg:pl-64 lg:pt-0">
        <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
