"use client";

// ============================================
// ASG Leads — Offline sync indicator
// ============================================
// Shows a slim bar on the leads page when there are queued mutations
// waiting to sync (and a simple offline notice when the browser is
// offline). Auto-flushes on reconnect; also offers tap-to-retry and
// tap-to-discard for anything stuck.

import { useEffect, useState } from "react";
import * as queue from "@/lib/offline-queue";
import { RefreshCw, WifiOff, CloudUpload, Trash2, Loader2 } from "lucide-react";

export function OfflineSyncBar() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    const unsub = queue.subscribe((n) => setPending(n));
    void queue.flush();
    const goOnline = () => {
      setOnline(true);
      void queue.flush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      unsub();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const flushNow = async () => {
    if (flushing) return;
    setFlushing(true);
    try {
      await queue.flush();
    } finally {
      setFlushing(false);
    }
  };

  if (!online) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-asg-warning/40 bg-asg-warning/10 px-3 py-2 text-sm text-asg-text">
        <WifiOff className="h-4 w-4 text-asg-warning" />
        <span>
          Offline — changes are saved on this device and will sync when you reconnect.
        </span>
      </div>
    );
  }

  if (pending === 0 && !flushing) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-asg-border bg-white px-3 py-2 text-sm">
      {flushing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-asg-gold-dark" />
          <span className="text-asg-text-secondary">Syncing changes…</span>
        </>
      ) : (
        <>
          <CloudUpload className="h-4 w-4 text-asg-text-muted" />
          <span className="text-asg-text">
            {pending} change{pending !== 1 ? "s" : ""} waiting to sync — retying automatically.
          </span>
          <button
            onClick={() => void flushNow()}
            className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-asg-border px-2.5 text-xs font-medium text-asg-text hover:border-asg-gold"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync now
          </button>
          <button
            onClick={() => queue.clear()}
            className="flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-asg-text-muted hover:text-asg-danger"
          >
            <Trash2 className="h-3.5 w-3.5" /> Discard
          </button>
        </>
      )}
    </div>
  );
}
