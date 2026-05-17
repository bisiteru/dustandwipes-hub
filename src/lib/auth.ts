// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Auth utilities
//  Phase 2 extraction; Phase 5d upgrade.
//
//  Password hashing migrated from plain SHA-256 (one round, fixed "dw" salt
//  fallback) to PBKDF2-SHA-256 (100k iterations, per-user random salt). The
//  old `hashPw` is preserved for backwards-compat verification of pwHashes
//  already in the DB, but new writes use `hashPwV2`.
//
//  Stored hash format for v2:
//     pbkdf2-sha256$<iterations>$<base64Salt>$<base64Hash>
//  Iterations are encoded so we can bump the work factor in the future
//  without rewriting verifyPw.
// ─────────────────────────────────────────────────────────────────────────────

const PBKDF2_PREFIX = "pbkdf2-sha256$";
const DEFAULT_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

// ── base64 helpers (browser-native btoa/atob; we hand them bytes → str) ──────
const bytesToB64 = (bytes: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const b64ToBytes = (b64: string): Uint8Array => {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};
const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");

// ── PBKDF2 derive helper ─────────────────────────────────────────────────────
async function derivePbkdf2(pw: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pw),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS
  );
  return new Uint8Array(bits);
}

// ── v2: PBKDF2-SHA256 ────────────────────────────────────────────────────────

/**
 * Hash a password with PBKDF2-SHA256. Generates a fresh per-user random salt
 * (16 bytes from crypto.getRandomValues) so two users with the same password
 * still produce different stored hashes — and so a single user's hash changes
 * on re-set even when they reuse a previous password.
 *
 * Returns a self-describing string:
 *     pbkdf2-sha256$<iterations>$<base64Salt>$<base64Hash>
 *
 * Returns null only if Web Crypto is unavailable (very old browsers / non-
 * HTTPS contexts) — callers should treat null as a hash failure and refuse
 * to persist a passwordless account.
 */
export async function hashPwV2(pw: string, iterations: number = DEFAULT_ITERATIONS): Promise<string | null> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const hash = await derivePbkdf2(pw, salt, iterations);
    return `${PBKDF2_PREFIX}${iterations}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
  } catch {
    return null;
  }
}

/**
 * Verify a password against a stored hash. Handles both:
 *  - v2 (PBKDF2): self-describing string, parses out iterations + salt
 *  - v1 (legacy SHA-256): hex digest, re-hashes with `${userId}:${pw}` and
 *    falls back to the legacy "dw" salt if `userId` is empty.
 *
 * Returns:
 *   { ok: true, needsUpgrade: boolean }   on success
 *   { ok: false, needsUpgrade: false }    on mismatch / error
 *
 * `needsUpgrade` is true when a v1 hash matched — the caller (login flow)
 * can opportunistically re-hash with v2 and persist the upgrade so the user
 * is migrated transparently on their next successful login.
 */
export interface VerifyResult {
  ok: boolean;
  needsUpgrade: boolean;
}

export async function verifyPw(
  pw: string,
  storedHash: string | undefined | null,
  userId: string = ""
): Promise<VerifyResult> {
  if (!storedHash) return { ok: false, needsUpgrade: false };

  // v2: PBKDF2
  if (storedHash.startsWith(PBKDF2_PREFIX)) {
    try {
      const rest = storedHash.slice(PBKDF2_PREFIX.length);
      const [iterStr, saltB64, hashB64] = rest.split("$");
      const iterations = Number(iterStr) || DEFAULT_ITERATIONS;
      const salt = b64ToBytes(saltB64);
      const expected = b64ToBytes(hashB64);
      const actual = await derivePbkdf2(pw, salt, iterations);
      return { ok: timingSafeEqual(actual, expected), needsUpgrade: false };
    } catch {
      return { ok: false, needsUpgrade: false };
    }
  }

  // v1: legacy SHA-256 hex. Match the historical hashPw behavior exactly.
  const legacy = await hashPw(pw, userId || "dw");
  const ok = legacy != null && legacy === storedHash;
  // needsUpgrade only fires when auth actually succeeded — otherwise we'd
  // ask the login flow to re-hash a wrong password.
  return { ok, needsUpgrade: ok };
}

/**
 * Constant-time comparison of two byte arrays. Prevents timing attacks where
 * an attacker could measure how quickly the comparison rejects a guess to
 * incrementally infer the correct hash.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ── v1: legacy SHA-256 (kept for backwards-compat verification) ──────────────

/**
 * @deprecated Use `hashPwV2` for new writes. This function is retained only
 * for `verifyPw` to check pwHashes written before the Phase 5d upgrade.
 *
 * Hash a password with SHA-256 using `${salt}:${pw}` as the message. The
 * salt is normally the user's stable `id`. Returns hex-encoded digest, or
 * null if Web Crypto is unavailable.
 */
export const hashPw = async (pw: string, salt: string = "dw"): Promise<string | null> => {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${salt}:${pw}`)
    );
    return bytesToHex(new Uint8Array(buf));
  } catch {
    return null;
  }
};
