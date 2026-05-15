// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Offline action queue
//  Phase 2 extraction. localStorage-backed queue + Background Sync API
//  integration for actions taken while disconnected.
// ─────────────────────────────────────────────────────────────────────────────

const OFFLINE_Q_KEY = "dw_offline_queue";

interface QueuedAction {
  type: string;
  data: any;
  queuedAt: string;
}

/**
 * Queue an offline action to be flushed when connectivity returns.
 * Also registers a Background Sync request with the Service Worker
 * (browsers that support it will fire the sync event automatically
 * when network is restored — see public/sw.js).
 */
export const queueOfflineAction = (type: string, data: any): void => {
  try {
    const q: QueuedAction[] = JSON.parse(localStorage.getItem(OFFLINE_Q_KEY) || "[]");
    q.push({ type, data, queuedAt: new Date().toISOString() });
    localStorage.setItem(OFFLINE_Q_KEY, JSON.stringify(q));
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready
        .then(r => (r as any).sync.register("dw-job-sync").catch(() => {}))
        .catch(() => {});
    }
  } catch (e: any) {
    console.warn("[Offline] Queue write:", e.message);
  }
};

/**
 * Flush the offline queue into the live jobs state.
 * Called when the browser reports online OR when the SW posts the
 * DW_DRAIN_OFFLINE_QUEUE message after a Background Sync wake-up.
 * Returns the count of queued actions that were drained.
 */
export const drainOfflineQueue = (
  setJobsFn: (updater: (current: any[]) => any[]) => void,
  dbSyncFn: (table: string, data: any[]) => Promise<void>
): number => {
  try {
    const q: QueuedAction[] = JSON.parse(localStorage.getItem(OFFLINE_Q_KEY) || "[]");
    if (q.length === 0) return 0;
    setJobsFn(current => {
      const updated = [...current];
      q.forEach(item => {
        if (item.type === "job_update") {
          const idx = updated.findIndex(j => j.id === item.data.id);
          if (idx >= 0) updated[idx] = { ...updated[idx], ...item.data };
          else updated.push(item.data);
        }
      });
      dbSyncFn("jobs", updated);
      return updated;
    });
    localStorage.removeItem(OFFLINE_Q_KEY);
    return q.length;
  } catch (e: any) {
    console.warn("[Offline] Queue drain:", e.message);
    return 0;
  }
};

export { OFFLINE_Q_KEY };
