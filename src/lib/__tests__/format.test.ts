// Tests for the name-matching helpers in lib/format.ts. These gate
// task/job/request visibility — a false match shows work to the wrong
// person, a false miss hides it from the right one.

import { sameName, csvHasName } from "../format";

describe("sameName", () => {
  it("matches exact names (case + whitespace insensitive)", () => {
    expect(sameName("Bola Adebayo", "bola adebayo")).toBe(true);
    expect(sameName("  Bola   Adebayo ", "Bola Adebayo")).toBe(true);
  });

  it("matches a bare first name against the full name (word-boundary prefix)", () => {
    expect(sameName("Bola", "Bola Adebayo")).toBe(true);
    expect(sameName("Bola Adebayo", "Bola")).toBe(true);
  });

  it("does NOT match a first name against a different user with a longer first name", () => {
    // The whole bug this fix targets: 'Bola' must not leak onto 'Bolanle'.
    expect(sameName("Bola", "Bolanle Akin")).toBe(false);
    expect(sameName("Bolanle Akin", "Bola")).toBe(false);
  });

  it("does not match unrelated names", () => {
    expect(sameName("Bola Adebayo", "Chinedu Okafor")).toBe(false);
  });

  it("returns false for empty/nullish input", () => {
    expect(sameName("", "Bola")).toBe(false);
    expect(sameName("Bola", "")).toBe(false);
    expect(sameName(null, undefined)).toBe(false);
  });

  it("does not match a mid/last-name fragment (no substring leniency)", () => {
    // Old `.includes()` would have matched 'ade' inside 'Bola Adebayo'.
    expect(sameName("ade", "Bola Adebayo")).toBe(false);
    expect(sameName("Adebayo", "Bola Adebayo")).toBe(false);
  });
});

describe("csvHasName", () => {
  it("finds a name in a comma-separated crew list", () => {
    expect(csvHasName("Bola Adebayo, Chinedu Okafor", "Bola Adebayo")).toBe(true);
    expect(csvHasName("Bola Adebayo, Chinedu Okafor", "Chinedu Okafor")).toBe(true);
  });

  it("matches a first name against a full name in the list", () => {
    expect(csvHasName("Bola Adebayo, Chinedu Okafor", "Bola")).toBe(true);
  });

  it("does not match a non-member", () => {
    expect(csvHasName("Bola Adebayo, Chinedu Okafor", "Bolanle")).toBe(false);
  });

  it("returns false for empty csv", () => {
    expect(csvHasName("", "Bola")).toBe(false);
    expect(csvHasName(null, "Bola")).toBe(false);
  });
});
