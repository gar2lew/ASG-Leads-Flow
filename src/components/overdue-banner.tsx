"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlarmClock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverdueBanner() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/follow-ups/overdue");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(Array.isArray(data.overdue) ? data.overdue.length : 0);
      } catch {
        // Banner is non-critical; silently retry on next mount
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  if (count === 0) return null;
  // Don't nag on the follow-ups page itself or during login
  if (pathname.startsWith("/follow-ups") || pathname === "/login" || pathname === "/") return null;

  return (
    <Link
      href="/follow-ups"
      className={cn(
        "mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 transition-colors hover:bg-amber-100",
        "min-h-[44px] py-3"
      )}
    >
      <AlarmClock className="h-5 w-5 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm font-medium text-amber-900">
        {count} overdue follow-up{count !== 1 ? "s" : ""} need{count === 1 ? "s" : ""} attention
      </p>
      <ChevronRight className="h-4 w-4 shrink-0 text-amber-700" />
    </Link>
  );
}
