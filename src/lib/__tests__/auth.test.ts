/**
 * @jest-environment node
 */
// Tests for password hashing in lib/auth.ts.
//
// Verifies the round-trip of PBKDF2-SHA256 (v2), the backwards-compatible
// verification of legacy SHA-256 hashes (v1), and the `needsUpgrade` signal
// the login flow uses to trigger transparent migration.
//
// Web Crypto is provided by Node 18+'s global `crypto` (already present in
// the jest environment via jsdom 22+ / CRA 5).

import { hashPw, hashPwV2, verifyPw } from "../auth";

describe("hashPwV2 (PBKDF2-SHA256)", () => {
  it("produces a self-describing string with the expected format", async () => {
    const out = await hashPwV2("hunter2");
    expect(out).not.toBeNull();
    // pbkdf2-sha256$<iterations>$<saltB64>$<hashB64>
    expect(out!).toMatch(/^pbkdf2-sha256\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  });

  it("two calls with the same password produce DIFFERENT hashes (random salt)", async () => {
    // Critical security property: rainbow-table resistance. If two users with
    // password "hunter2" produced the same hash, leak of one row exposes all.
    const a = await hashPwV2("hunter2");
    const b = await hashPwV2("hunter2");
    expect(a).not.toBe(b);
  });

  it("encodes the iteration count so it can be bumped later without breaking", async () => {
    const out = await hashPwV2("hunter2", 50_000);
    expect(out).toMatch(/^pbkdf2-sha256\$50000\$/);
  });
});

describe("verifyPw — v2 round-trip", () => {
  it("verifies a correct password against a v2 hash", async () => {
    const hash = await hashPwV2("hunter2");
    const result = await verifyPw("hunter2", hash);
    expect(result).toEqual({ ok: true, needsUpgrade: false });
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPwV2("hunter2");
    const result = await verifyPw("wrong", hash);
    expect(result).toEqual({ ok: false, needsUpgrade: false });
  });

  it("rejects empty/undefined/null stored hash", async () => {
    expect(await verifyPw("hunter2", "")).toEqual({ ok: false, needsUpgrade: false });
    expect(await verifyPw("hunter2", undefined)).toEqual({ ok: false, needsUpgrade: false });
    expect(await verifyPw("hunter2", null)).toEqual({ ok: false, needsUpgrade: false });
  });

  it("rejects a malformed v2 string without throwing", async () => {
    // A truncated or corrupted hash row shouldn't crash auth — just fail
    // verification, falling through to "incorrect password".
    expect(await verifyPw("hunter2", "pbkdf2-sha256$bogus")).toEqual({
      ok: false, needsUpgrade: false,
    });
  });

  it("verifies across different iteration counts (forward-compat)", async () => {
    // When we eventually bump iterations to 200k, existing 100k hashes must
    // still verify. The iteration count is encoded in the stored string, so
    // verifyPw uses the same count that hashPwV2 used at write time.
    const slow = await hashPwV2("hunter2", 100_000);
    const slower = await hashPwV2("hunter2", 200_000);
    expect((await verifyPw("hunter2", slow)).ok).toBe(true);
    expect((await verifyPw("hunter2", slower)).ok).toBe(true);
  });
});

describe("verifyPw — v1 legacy SHA-256 backwards compat", () => {
  it("verifies a legacy hash and flags it for upgrade", async () => {
    const legacy = await hashPw("hunter2", "user-id-123");
    const result = await verifyPw("hunter2", legacy, "user-id-123");
    expect(result).toEqual({ ok: true, needsUpgrade: true });
  });

  it("rejects an incorrect password against a legacy hash", async () => {
    const legacy = await hashPw("hunter2", "user-id-123");
    const result = await verifyPw("wrong", legacy, "user-id-123");
    expect(result).toEqual({ ok: false, needsUpgrade: false });
  });

  it("handles legacy hashes that used the default 'dw' salt", async () => {
    // Some very early users may have been hashed with the fallback salt
    // before per-user ids were always passed. verifyPw with an empty userId
    // should fall through to the same default.
    const legacy = await hashPw("hunter2"); // uses default "dw"
    const result = await verifyPw("hunter2", legacy, "");
    expect(result).toEqual({ ok: true, needsUpgrade: true });
  });

  it("v2 verification does NOT flag needsUpgrade", async () => {
    // Once a user is on v2, the login flow shouldn't redundantly trigger
    // re-hashing on every login. Only v1 → v2 transitions set the flag.
    const hash = await hashPwV2("hunter2");
    const result = await verifyPw("hunter2", hash);
    expect(result.needsUpgrade).toBe(false);
  });
});

describe("hashPw (v1 legacy)", () => {
  it("is deterministic — same password + salt = same hex digest", async () => {
    const a = await hashPw("hunter2", "user-id-123");
    const b = await hashPw("hunter2", "user-id-123");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/); // 32 bytes of SHA-256 hex
  });

  it("different salts produce different digests", async () => {
    const a = await hashPw("hunter2", "user-A");
    const b = await hashPw("hunter2", "user-B");
    expect(a).not.toBe(b);
  });
});
