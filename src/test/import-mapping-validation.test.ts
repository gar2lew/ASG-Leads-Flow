// ============================================
// ASG Leads — Import Mapping & Validation Tests
// ============================================

import { describe, it, expect, beforeEach } from "vitest";
import { autoMapHeaders, validateImportRowsLocal, validateRow, IMPORT_LIMITS } from "@/lib/import-pure";
import type { ColumnMapping, RawRow } from "@/lib/domain/import";

describe("autoMapHeaders", () => {
  it("exact header names map correctly", () => {
    const headers = ["name", "mobile", "address", "suburb", "postcode"];
    const result = autoMapHeaders(headers);
    expect(result.name).toBe("name");
    expect(result.mobile).toBe("mobile");
    expect(result.address).toBe("address");
    expect(result.suburb).toBe("suburb");
    expect(result.postcode).toBe("postcode");
  });

  it("case-insensitive mapping", () => {
    const headers = ["NAME", "Mobile", "Address", "SUBURB"];
    const result = autoMapHeaders(headers);
    expect(result.NAME).toBe("name");
    expect(result.Mobile).toBe("mobile");
    expect(result.Address).toBe("address");
    expect(result.SUBURB).toBe("suburb");
  });

  it("common synonyms mapped", () => {
    const headers = ["Lead Name", "Phone", "Contact Number", "Street Address", "City", "Zip", "Comments", "Renter Owner"];
    const result = autoMapHeaders(headers);
    expect(result["Lead Name"]).toBe("name");
    expect(result.Phone).toBe("mobile");
    expect(result["Contact Number"]).toBe("mobile");
    expect(result["Street Address"]).toBe("address");
    expect(result.City).toBe("suburb");
    expect(result.Zip).toBe("postcode");
    expect(result.Comments).toBe("notes");
    expect(result["Renter Owner"]).toBe("renterOwner");
  });

  it("unknown header remains ignore", () => {
    const headers = ["name", "mobile", "unknown_field", "custom_column"];
    const result = autoMapHeaders(headers);
    expect(result.unknown_field).toBe("ignore");
    expect(result.custom_column).toBe("ignore");
  });

  it("employment and superannuation synonyms", () => {
    const headers = ["Employment Status", "Superannuation", "Super"];
    const result = autoMapHeaders(headers);
    expect(result["Employment Status"]).toBe("employmentStatus");
    expect(result.Superannuation).toBe("superannuation");
    expect(result.Super).toBe("superannuation");
  });

  it("assigned rep synonyms", () => {
    const headers = ["Assigned Rep", "Rep", "Consultant", "Agent", "Staff"];
    const result = autoMapHeaders(headers);
    expect(result["Assigned Rep"]).toBe("assignedRep");
    expect(result.Rep).toBe("assignedRep");
    expect(result.Consultant).toBe("assignedRep");
    expect(result.Agent).toBe("assignedRep");
    expect(result.Staff).toBe("assignedRep");
  });

  it("source synonyms", () => {
    const headers = ["Source", "Origin", "Campaign"];
    const result = autoMapHeaders(headers);
    expect(result.Source).toBe("source");
    expect(result.Origin).toBe("source");
    expect(result.Campaign).toBe("source");
  });
});

describe("validateRow", () => {
  let duplicateMobilesInFile: Set<string>;

  beforeEach(() => {
    duplicateMobilesInFile = new Set<string>();
  });

  it("valid row passes", () => {
    const raw = { name: "John Doe", mobile: "0412345678", address: "123 Main St", suburb: "Sydney" };
    const mapping = { name: "name", mobile: "mobile", address: "address", suburb: "suburb" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("valid");
    expect(result.errors).toHaveLength(0);
    expect(result.normalizedMobile).toBe("+61412345678");
  });

  it("missing name fails", () => {
    const raw = { mobile: "0412345678" };
    const mapping = { name: "name", mobile: "mobile" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Name is required"))).toBe(true);
  });

  it("missing mobile fails", () => {
    const raw = { name: "John Doe" };
    const mapping = { name: "name", mobile: "mobile" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Mobile is required"))).toBe(true);
  });

  it("invalid Australian mobile fails", () => {
    const raw = { name: "John", mobile: "123456" };
    const mapping = { name: "name", mobile: "mobile" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Invalid Australian mobile"))).toBe(true);
  });

  it("normalizes various Australian mobile formats", () => {
    const testCases = [
      { input: "0412345678", expected: "+61412345678" },
      { input: "+61412345678", expected: "+61412345678" },
      { input: "61412345678", expected: "+61412345678" },
      { input: "0412 345 678", expected: "+61412345678" },
      { input: "0412-345-678", expected: "+61412345678" },
      { input: "(04) 1234 5678", expected: "+61412345678" },
    ];

    for (const tc of testCases) {
      const raw = { name: "John", mobile: tc.input };
      const mapping = { name: "name", mobile: "mobile" } as Record<string, any>;
      const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);
      expect(result.normalizedMobile).toBe(tc.expected);
    }
  });

  it("invalid lead status fails", () => {
    const raw = { name: "John", mobile: "0412345678", status: "unknown_status" };
    const mapping = { name: "name", mobile: "mobile", status: "status" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Invalid status"))).toBe(true);
  });

  it("invalid renter/owner fails", () => {
    const raw = { name: "John", mobile: "0412345678", renterOwner: "tenant" };
    const mapping = { name: "name", mobile: "mobile", renterOwner: "renterOwner" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Invalid renter/owner"))).toBe(true);
  });

  it("invalid employment status fails", () => {
    const raw = { name: "John", mobile: "0412345678", employmentStatus: "freelancer" };
    const mapping = { name: "name", mobile: "mobile", employmentStatus: "employmentStatus" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Invalid employment status"))).toBe(true);
  });

  it("invalid superannuation fails", () => {
    const raw = { name: "John", mobile: "0412345678", superannuation: "100k_plus" };
    const mapping = { name: "name", mobile: "mobile", superannuation: "superannuation" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Invalid superannuation"))).toBe(true);
  });

  it("oversized field fails", () => {
    const longString = "x".repeat(501);
    const raw = { name: "John", mobile: "0412345678", notes: longString };
    const mapping = { name: "name", mobile: "mobile", notes: "notes" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("exceeds maximum length"))).toBe(true);
  });

  it("duplicate in file detected", () => {
    duplicateMobilesInFile.add("+61412345678");

    const raw = { name: "John", mobile: "0412345678" };
    const mapping = { name: "name", mobile: "mobile" } as Record<string, any>;

    const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);

    expect(result.errors.some((e) => e.includes("Duplicate mobile number in file"))).toBe(true);
  });

  it("valid status values pass", () => {
    const validStatuses = ["new", "contacted", "qualified", "unqualified", "converted"];
    let counter = 0;
    for (const status of validStatuses) {
      counter++;
      const raw = { name: "John", mobile: `041234567${counter}`, status };
      const mapping = { name: "name", mobile: "mobile", status: "status" } as Record<string, any>;
      const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);
      expect(result.status).toBe("valid");
    }
  });

  it("valid renter/owner values pass", () => {
    const validValues = ["renter", "owner", "other"];
    let counter = 0;
    for (const value of validValues) {
      counter++;
      const raw = { name: "John", mobile: `04123456${counter}8`, renterOwner: value };
      const mapping = { name: "name", mobile: "mobile", renterOwner: "renterOwner" } as Record<string, any>;
      const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);
      expect(result.status).toBe("valid");
    }
  });

  it("valid employment values pass", () => {
    const validValues = ["full_time", "part_time", "casual", "self_employed", "retired", "other"];
    let counter = 0;
    for (const value of validValues) {
      counter++;
      const raw = { name: "John", mobile: `0412345${counter}78`, employmentStatus: value };
      const mapping = { name: "name", mobile: "mobile", employmentStatus: "employmentStatus" } as Record<string, any>;
      const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);
      expect(result.status).toBe("valid");
    }
  });

  it("valid superannuation values pass", () => {
    const validValues = ["0_50k", "50k_100k", "100k_200k", "200k_500k", "500k_plus", "unknown"];
    let counter = 0;
    for (const value of validValues) {
      counter++;
      const raw = { name: "John", mobile: `041234${counter}678`, superannuation: value };
      const mapping = { name: "name", mobile: "mobile", superannuation: "superannuation" } as Record<string, any>;
      const result = validateRow(raw, 1, mapping, duplicateMobilesInFile);
      expect(result.status).toBe("valid");
    }
  });
});

describe("validateImportRowsLocal", () => {
  it("detects duplicate mobiles in same file", () => {
    const rows: RawRow[] = [
      { rowNumber: 1, raw: { Name: "John", Mobile: "0412345678" } },
      { rowNumber: 2, raw: { Name: "Jane", Mobile: "0412345678" } },
    ];
    const mapping: ColumnMapping = { fields: { Name: "name", Mobile: "mobile" } };

    const results = validateImportRowsLocal(rows, mapping);

    expect(results[0].status).toBe("valid");
    expect(results[1].status).toBe("invalid");
    expect(results[1].errors.some((e) => e.includes("Duplicate mobile number in file"))).toBe(true);
  });

  it("normalizes mobile before duplicate check", () => {
    const rows: RawRow[] = [
      { rowNumber: 1, raw: { Name: "John", Mobile: "0412345678" } },
      { rowNumber: 2, raw: { Name: "Jane", Mobile: "+61412345678" } },
    ];
    const mapping: ColumnMapping = { fields: { Name: "name", Mobile: "mobile" } };

    const results = validateImportRowsLocal(rows, mapping);

    expect(results[0].status).toBe("valid");
    expect(results[1].status).toBe("invalid");
    expect(results[1].errors.some((e) => e.includes("Duplicate mobile number in file"))).toBe(true);
  });

  it("multiple rows validated independently", () => {
    const rows: RawRow[] = [
      { rowNumber: 1, raw: { Name: "John", Mobile: "0412345678" } },
      { rowNumber: 2, raw: { Name: "", Mobile: "0487654321" } }, // missing name
      { rowNumber: 3, raw: { Name: "Bob", Mobile: "invalid" } }, // invalid mobile
    ];
    const mapping: ColumnMapping = { fields: { Name: "name", Mobile: "mobile" } };

    const results = validateImportRowsLocal(rows, mapping);

    expect(results[0].status).toBe("valid");
    expect(results[1].status).toBe("invalid");
    expect(results[2].status).toBe("invalid");
  });
});

describe("import limits", () => {
  it("IMPORT_LIMITS constants defined correctly", () => {
    expect(IMPORT_LIMITS.MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(IMPORT_LIMITS.MAX_ROWS).toBe(10000);
    expect(IMPORT_LIMITS.MAX_COLUMNS).toBe(50);
    expect(IMPORT_LIMITS.MAX_FIELD_LENGTH).toBe(500);
  });
});