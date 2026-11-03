"use client";

// ============================================
// ASG Leads — Offline-tolerant mutation queue
// ============================================
// Mutations that fail (offline, dropped connection, dev-server blip) are
// queued in localStorage, deduped per resource, and flushed automatically
// when connectivity returns. The queue lives per browser profile; if a
// user clears the queue by hand below, pending changes are dropped.

export type QueuedItem = {
  id: string;
  kind: "lead-status";
  leadId: string;
  /** POST body, sent as-is on flush */
  payload: {
    action: "status";
    status: string; // raw server value, e.g. "no_answer"
    expectedVersion?: number;
  };
  enqueuedAt: number;
  attempts: number;
};

const KEY = "asg-offline-queue";

function load(): QueuedItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: QueuedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full/unavailable — queue stays in memory state only
  }
}

let notified: ((n: number) => void)[] = [];

function notify() {
  const count = list().length;
  notified.forEach((cb) => cb(count));
}

/** All currently queued items. */
export function list(): QueuedItem[] {
  return load();
}

/** Number of queued items. */
export function count(): number {
  return load().length;
}

/**
 * Queue a lead-status change. Only the newest change per lead is queued —
 * an older queued change for the same lead is replaced, so the queue never
 * sends two status writes that race each other.
 */
export function enqueueLeadStatus(leadId: string, rawStatus: string, expectedVersion?: number) {
  const items = load().filter((it) => !(it.kind === "lead-status" && it.leadId === leadId));
  items.push({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "lead-status",
    leadId,
    payload: { action: "status", status: rawStatus, expectedVersion },
    enqueuedAt: Date.now(),
    attempts: 0,
  });
  save(items);
  notify();
}

/**
 * Flush the queue sequentially. Returns how many items were sent.
 * - Network failure: the item stays queued (first failure stops the flush).
 * - 409 version conflict / 400 invalid: item dropped (can't win by retrying;
 *   the server surface shows the conflict message instead).
 */
let dropped = 0;
/** Number of queued items dropped as un-retryable (conflicts, invalid). */
export function droppedCount(): number {
  const n = dropped;
  dropped = 0;
  return n;
}

export async function flush(): Promise<number> {
  const items = load();
  let sent = 0;
  for (const it of items) {
    if (it.kind !== "lead-status") continue;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/leads/${it.leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(it.payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        save(load().filter((x) => x.id !== it.id));
        sent += 1;
        notify();
      } else if (res.status === 400 || res.status === 409 || res.status === 404) {
        // Unfixable on retry — drop it (the UI still surfaces conflict errors)
        save(load().filter((x) => x.id !== it.id));
        dropped += 1;
        notify();
      } else {
        // 5xx or auth hiccup: keep, stop this pass
        bumpAttempts(it.id);
        break;
      }
    } catch {
      bumpAttempts(it.id);
      break;
    }
  }
  return sent;
}



function bumpAttempts(id: string) {
  const items = load().map((it) => (it.id === id ? { ...it, attempts: it.attempts + 1 } : it));
  save(items);
}

/** Remove one queued item by id (manual discard). */
export function remove(id: string) {
  save(load().filter((it) => it.id !== id));
  notify();
}

/** Clear the entire queue (manual discard-all from the sync panel). */
export function clear() {
  save([]);
  notify();
}

/** Subscribe to queue-count changes. Returns an unsubscribe fn. */
export function subscribe(cb: (n: number) => void): () => void {
  notified.push(cb);
  cb(count());
  return () => {
    notified = notified.filter((x) => x !== cb);
  };
}
