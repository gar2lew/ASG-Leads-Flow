// ============================================
// ASG Leads — Mobile Normalization Unit Tests
// ============================================

import { describe, it, expect } from "vitest";
import { normalizeAustralianMobile, isPlausibleAustralianMobile, formatMobileForDisplay } from "@/lib/domain/mobile";

describe("normalizeAustralianMobile", () => {
  it("normalizes standard mobile with spaces", () => {
    expect(normalizeAustralianMobile("0412 345 678")).toBe("+61412345678");
  });

  it("normalizes mobile without spaces", () => {
    expect(normalizeAustralianMobile("0412345678")).toBe("+61412345678");
  });

  it("normalizes mobile with +61 prefix", () => {
    expect(normalizeAustralianMobile("+61 412 345 678")).toBe("+61412345678");
  });

  it("normalizes mobile with 61 prefix (no plus)", () => {
    expect(normalizeAustralianMobile("61412345678")).toBe("+61412345678");
  });

  it("normalizes mobile with +61 and no spaces", () => {
    expect(normalizeAustralianMobile("+61412345678")).toBe("+61412345678");
  });

  it("returns null for empty string", () => {
    expect(normalizeAustralianMobile("")).toBeNull();
  });

  it("returns null for too-short number", () => {
    expect(normalizeAustralianMobile("041234567")).toBeNull();
  });

  it("returns null for too-long number", () => {
    expect(normalizeAustralianMobile("041234567890")).toBeNull();
  });

  it("returns null for landline number", () => {
    expect(normalizeAustralianMobile("08 9222 1111")).toBeNull();
  });

  it("returns null for non-mobile starting digit", () => {
    expect(normalizeAustralianMobile("0312345678")).toBeNull();
  });

  it("returns null for international non-AU number", () => {
    expect(normalizeAustralianMobile("+1 555 123 4567")).toBeNull();
  });

  it("handles leading/trailing whitespace", () => {
    expect(normalizeAustralianMobile("  0412 345 678  ")).toBe("+61412345678");
  });
});

describe("isPlausibleAustralianMobile", () => {
  it("accepts standard 10-digit mobile", () => {
    expect(isPlausibleAustralianMobile("0412345678")).toBe(true);
  });

  it("accepts formatted mobile", () => {
    expect(isPlausibleAustralianMobile("0412 345 678")).toBe(true);
  });

  it("accepts +61 format", () => {
    expect(isPlausibleAustralianMobile("+61 412 345 678")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isPlausibleAustralianMobile("")).toBe(false);
  });

  it("rejects landline", () => {
    expect(isPlausibleAustralianMobile("08 9222 1111")).toBe(false);
  });
});

describe("formatMobileForDisplay", () => {
  it("formats E.164 correctly", () => {
    expect(formatMobileForDisplay("+61412345678")).toBe("+61 412 345 678");
  });

  it("returns input for invalid format", () => {
    expect(formatMobileForDisplay("invalid")).toBe("invalid");
  });
});
