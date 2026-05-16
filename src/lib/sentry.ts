// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Sentry error reporting wrapper
//
//  Centralized so the rest of the app only sees a small surface: init() at
//  boot, setUser() on login, captureException() from ErrorBoundary, and a
//  noop everywhere if REACT_APP_SENTRY_DSN is unset (local dev / preview).
//
//  Gating: Sentry only initializes when DSN is present AND we are running
//  a production build (NODE_ENV === "production"). Development errors stay
//  loud in the console where the developer can see them.
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV !== "production") return;
  try {
    Sentry.init({
      dsn,
      environment: process.env.REACT_APP_SENTRY_ENV || "production",
      release: process.env.REACT_APP_SENTRY_RELEASE,
      // Conservative sample rates — Dust & Wipes is internal-only with a
      // small user base. We want every error but not every page view.
      tracesSampleRate: 0.1,
      // Filter out the noisy benign cases that aren't actionable.
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
        "Non-Error promise rejection captured",
        // Network blips while a field technician walks behind a building
        "NetworkError",
        "Load failed",
      ],
    });
    initialized = true;
  } catch (e) {
    // Sentry should never break the app, even if its own init throws.
    console.warn("[Sentry] init failed:", e);
  }
}

export function setSentryUser(user: { id?: string; name?: string; role?: string } | null): void {
  if (!initialized) return;
  try {
    if (user) {
      // Intentionally NOT sending email — the user's `id` + role is enough
      // for triage, and we don't want PII in Sentry by default.
      Sentry.setUser({
        id: user.id ? String(user.id) : undefined,
        username: user.name,
      });
      Sentry.setTag("role", user.role || "unknown");
    } else {
      Sentry.setUser(null);
    }
  } catch (e) {
    console.warn("[Sentry] setUser failed:", e);
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    if (context) {
      Sentry.withScope(scope => {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (e) {
    console.warn("[Sentry] captureException failed:", e);
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
  if (!initialized) return;
  try {
    Sentry.captureMessage(message, level);
  } catch (e) {
    console.warn("[Sentry] captureMessage failed:", e);
  }
}

export function isSentryActive(): boolean {
  return initialized;
}
