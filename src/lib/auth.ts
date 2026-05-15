// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Auth utilities
//  Phase 2 extraction. SHA-256 password hashing via Web Crypto API
//  (no extra library required).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash a password with SHA-256 using `${salt}:${pw}` as the message.
 *
 * The `salt` is normally the user's stable `id` so two users with the same
 * password get different hashes. Returns hex-encoded digest (64 chars).
 *
 * Returns null if Web Crypto is unavailable (very old browsers / non-HTTPS
 * contexts) — callers should treat null as a hash mismatch.
 */
export const hashPw = async (pw: string, salt: string = "dw"): Promise<string | null> => {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${salt}:${pw}`)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
};
