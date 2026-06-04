// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Login screen
//  Phase 4c extraction. Email/password login via Supabase Auth + 3-tier
//  fallback (Supabase → local pwHash → username-match for technicians).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { G, O, inp } from "../lib/constants";
import { cStatus } from "../lib/format";
import { verifyPw, hashPwV2 } from "../lib/auth";
import { dbSync } from "../lib/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { LOGO } from "../lib/logo";
import { Fld } from "../components/ui/primitives";
import type { AppUser, Client, CurrentUser } from "../lib/schemas";

interface LoginScreenProps {
  onLogin: (user: CurrentUser) => void;
  users: AppUser[];
  clients: Client[];
}

// Supabase Auth password-grant response (only fields we read).
interface SupabaseAuthResponse {
  access_token?: string;
  user?: { id: string; email?: string };
  error_description?: string;
  msg?: string;
  message?: string;
}

export function LoginScreen({ onLogin, users, clients }: LoginScreenProps) {
  const [em, setEm] = useState<string>("");
  const [pw, setPw] = useState<string>("");
  const [sp, setSp] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [forgot, setForgot] = useState<boolean>(false);
  const [fpEmail, setFpEmail] = useState<string>("");
  const [fpSent, setFpSent] = useState<boolean>(false);
  const [fpBusy, setFpBusy] = useState<boolean>(false);
  const [fpErr, setFpErr] = useState<string>("");

  const go = async (): Promise<void> => {
    if (busy || !em.trim() || !pw) return;
    setBusy(true);
    setErr("");
    try {
      // 1. Try Supabase Auth (email + password)
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: em.trim(), password: pw }),
      });
      const d: SupabaseAuthResponse = await r.json(); // always parse — we need error body too
      if (r.ok && d.user) {
        const profile = users.find(
          (u) => (u.email && u.email === d.user?.email) || u.username === em.trim()
        );
        const displayEmail = d.user.email || em.trim();
        const displayName = profile?.name || displayEmail;
        onLogin({
          ...(profile || {}),
          id: d.user.id,
          email: displayEmail,
          name: displayName,
          role: profile?.role || "Technician",
          initial: (profile?.name || displayEmail || "?")[0].toUpperCase(),
          accessToken: d.access_token,
        });
        return;
      }
      // Supabase returned an error — read what it actually said
      const sbMsg = (d?.error_description || d?.msg || d?.message || "").toLowerCase();
      console.warn("[Auth] Supabase error:", r.status, d?.error_description || d?.message);
      if (sbMsg.includes("email not confirmed")) {
        setErr(
          "Your email address hasn't been confirmed yet. The Admin must open the Supabase dashboard → Authentication → Users → find your account → click Confirm."
        );
        return;
      }
      // 2. Local hash-based auth (password set via Settings → Users in the app)
      const localUser = users.find(
        (u) =>
          (u.email && u.email === em.trim()) ||
          (u.username && u.username === em.trim())
      );
      if (localUser) {
        if (localUser.pwHash) {
          const result = await verifyPw(pw, localUser.pwHash, localUser.id);
          if (result.ok) {
            // Transparent migration: if this user's stored hash is still the
            // legacy SHA-256, opportunistically re-hash with PBKDF2 + a fresh
            // random salt and persist. No password change required; the user
            // just logs in once and is silently upgraded.
            if (result.needsUpgrade) {
              try {
                const v2 = await hashPwV2(pw);
                if (v2) {
                  const upgraded = users.map(u =>
                    u.id === localUser.id ? { ...u, pwHash: v2 } : u
                  );
                  // Fire-and-forget — login should proceed even if persist fails.
                  dbSync("users", upgraded).catch(() => {});
                }
              } catch {
                // Ignore upgrade failures — auth itself already succeeded.
              }
            }
            onLogin(localUser as CurrentUser);
            return;
          }
          setErr("Incorrect password.");
          return;
        }
        // Technician phone-number login (no password hash set — username match is sufficient)
        if (localUser.username && localUser.username === em.trim()) {
          onLogin(localUser as CurrentUser);
          return;
        }
        // Known email but no local password: give Supabase's actual reason
        setErr(
          d?.error_description ||
            d?.message ||
            "Login failed. Check your password or ask Admin to reset it."
        );
        return;
      }
      setErr("Account not found. Check your email address or ask Admin.");
    } catch {
      // Network/config error — diagnose before falling back
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        setErr(
          "Supabase environment variables are not configured on this deployment. Contact the developer to set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in Vercel project settings."
        );
        return;
      }
      // Genuine network outage. Allow:
      //   - any Admin (emergency org-level access), OR
      //   - any user with no pwHash AND a matching username (technicians log in
      //     by phone-number-only, so they have no Supabase Auth record to even
      //     attempt — without this branch they're stranded whenever the
      //     auth endpoint is unreachable).
      const fallback = users.find(
        (u) => u.email === em.trim() || u.username === em.trim()
      );
      if (fallback) {
        const isAdmin = fallback.role === "Admin";
        const isPwlessTechMatch = !fallback.pwHash && !!fallback.username && fallback.username === em.trim();
        if (isAdmin || isPwlessTechMatch) {
          onLogin(fallback as CurrentUser);
          return;
        }
      }
      setErr("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (): Promise<void> => {
    if (fpBusy || !fpEmail.trim()) return;
    setFpBusy(true);
    setFpErr("");
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim() }),
      });
      if (r.ok || r.status === 200) {
        setFpSent(true);
      } else {
        // Supabase Auth doesn't know this email — user hasn't been created there yet
        const isLocal = users.some((u) => u.email === fpEmail.trim());
        setFpErr(
          isLocal
            ? "This account uses local password login. Ask your Admin to set a new password in Settings → Users → Edit."
            : "Email not recognised. Check for typos or contact bisit@dustandwipes.com."
        );
      }
    } catch {
      setFpErr("Network error. Please try again.");
    } finally {
      setFpBusy(false);
    }
  };

  // Portfolio value = sum of contracts that haven't expired yet (cStatus !== "Expired").
  // This includes Active, Expiring Soon, Critical, and Unknown (no end date set).
  // Number() coercion is defensive — guards against legacy string values in c.tot.
  const totalPortfolio = clients
    .filter((c) => cStatus(c.ce) !== "Expired")
    .reduce((s, c) => s + (Number(c.tot) || 0), 0);
  const portStr =
    totalPortfolio >= 1e9
      ? `₦${(totalPortfolio / 1e9).toFixed(1)}B`
      : totalPortfolio >= 1e6
      ? `₦${(totalPortfolio / 1e6).toFixed(1)}M`
      : totalPortfolio >= 1e3
      ? `₦${(totalPortfolio / 1e3).toFixed(0)}K`
      : totalPortfolio > 0
      ? `₦${totalPortfolio}`
      : "--";
  const roleCount =
    [...new Set(users.map((u) => u.role).filter((r): r is string => !!r))].length || 3;
  const loginStats: Array<[string | number, string]> = [
    [clients.length || "--", "Clients"],
    ["15", "Modules"],
    [portStr, "Portfolio"],
    [roleCount, "User Roles"],
  ];

  return (
    <div className="min-h-screen relative flex overflow-hidden">
      {/* ── Full-screen background image ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/login-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Gradient overlay — deeper on right to keep card readable, lighter on left to show image */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg,rgba(11,53,24,0.55) 0%,rgba(11,53,24,0.35) 45%,rgba(0,0,0,0.60) 100%)",
        }}
      />

      {/* ── Content layer ── */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Left branding panel — desktop only */}
        <div className="hidden lg:flex flex-1 flex-col justify-between p-14 text-white">
          <div>
            <img
              src={LOGO}
              alt="D&W"
              className="w-20 mb-8 drop-shadow-xl rounded-2xl bg-white/10 backdrop-blur-sm p-1.5 border border-white/20"
            />
            <h1
              className="text-5xl font-black leading-tight mb-2"
              style={{
                fontFamily: "Georgia,serif",
                letterSpacing: "-1.5px",
                textShadow: "0 2px 20px rgba(0,0,0,0.4)",
              }}
            >
              Operations Hub
            </h1>
            <p className="text-green-200 text-xl font-light mt-1">Dust &amp; Wipes Limited</p>
            <p className="text-green-300/80 italic text-sm mt-2">"Restoring a Clean World"</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-72 mb-4">
            {loginStats.map(([v, l]) => (
              <div
                key={l}
                className="rounded-2xl p-4 text-center backdrop-blur-sm"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div
                  className="text-2xl font-black"
                  style={{ color: O, textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}
                >
                  {v}
                </div>
                <div className="text-green-200 text-xs mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right login card */}
        <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:max-w-md lg:ml-auto">
          <div className="w-full max-w-md">
            {/* Mobile-only logo */}
            <div className="flex flex-col items-center mb-6 lg:hidden">
              <img
                src={LOGO}
                alt="D&W"
                className="w-16 mb-3 rounded-2xl bg-white/10 backdrop-blur-sm p-1.5 border border-white/20 drop-shadow-xl"
              />
              <h2
                className="text-2xl font-black text-white"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
              >
                Operations Hub
              </h2>
              <p className="text-green-200 text-sm">Dust &amp; Wipes Limited</p>
            </div>

            {/* Card */}
            <div
              className="bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <div className="hidden lg:block text-center mb-7">
                <img
                  src={LOGO}
                  alt="D&W"
                  className="w-12 mx-auto mb-3 rounded-xl bg-gray-50 p-1 shadow-sm"
                />
                <h2 className="text-2xl font-black text-gray-800">Welcome Back</h2>
                <p className="text-gray-400 text-sm mt-0.5">Sign in to Operations Hub</p>
              </div>
              <div className="lg:hidden text-center mb-6">
                <h2 className="text-xl font-black text-gray-800">Sign In</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  Enter your credentials to continue
                </p>
              </div>

              {err && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              )}

              <div className="space-y-4">
                <Fld label="Email or Username">
                  <input
                    className={inp}
                    type="text"
                    value={em}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setEm(e.target.value);
                      setErr("");
                    }}
                    placeholder="email@dustandwipes.com or phone number"
                    autoComplete="username"
                  />
                </Fld>
                <Fld label="Password">
                  <div className="relative">
                    <input
                      className={inp + " pr-10"}
                      type={sp ? "text" : "password"}
                      value={pw}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setPw(e.target.value);
                        setErr("");
                      }}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") void go();
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setSp((p) => !p)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {sp ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    onClick={() => setForgot(true)}
                    className="text-xs mt-1.5 text-green-700 hover:underline float-right"
                  >
                    Forgot password?
                  </button>
                </Fld>
                <button
                  onClick={() => void go()}
                  disabled={busy || !em.trim() || !pw}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm mt-2 clear-both flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                  style={{
                    background: `linear-gradient(135deg,${G} 0%,#2D8A45 100%)`,
                    boxShadow: "0 4px 14px rgba(11,53,24,0.35)",
                  }}
                >
                  {busy && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {busy ? "Signing in…" : "Sign In →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Forgot password modal ── */}
      {forgot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-1">Reset Password</h3>
            <p className="text-xs text-gray-400 mb-5">
              Enter your email and we'll send a password reset link.
            </p>
            {fpSent ? (
              <div
                className="p-4 rounded-xl text-sm text-green-700 font-medium"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
              >
                {" "}
                Reset link sent to <strong>{fpEmail}</strong>. Check your inbox (including spam
                folder).
              </div>
            ) : (
              <div className="space-y-4">
                {fpErr && (
                  <div
                    className="p-3 rounded-xl text-xs text-red-700"
                    style={{ background: "#fee2e2" }}
                  >
                    {fpErr}
                  </div>
                )}
                <Fld label="Email Address">
                  <input
                    className={inp}
                    type="email"
                    value={fpEmail}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setFpEmail(e.target.value);
                      setFpErr("");
                    }}
                    placeholder="your@dustandwipes.com"
                  />
                </Fld>
                <button
                  onClick={() => void sendReset()}
                  disabled={!fpEmail.trim() || fpBusy}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: G }}
                >
                  {fpBusy && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {fpBusy ? "Sending…" : "Send Reset Link"}
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setForgot(false);
                setFpSent(false);
                setFpEmail("");
                setFpErr("");
              }}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
