"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function Shell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-asg-cream">
        <div className="text-asg-text-muted">Loading...</div>
      </div>
    );
  }

  // Not authenticated - don't render protected content
  if (!user) {
    return null;
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
