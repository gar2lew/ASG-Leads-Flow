// ============================================
// ASG Leads — Import Parsing Tests
// ============================================

import { describe, it, expect } from "vitest";
import { parseCSV, parseXLSX, IMPORT_LIMITS } from "@/lib/import-pure";

describe("parseCSV", () => {
  it("valid CSV with simple rows", () => {
    const csv = `Name,Mobile,Address,Suburb
John Doe,0412345678,123 Main St,Sydney
Jane Smith,0487654321,456 Oak Ave,Melbourne`;

    const result = parseCSV(csv);

    expect(result.headers).toEqual(["Name", "Mobile", "Address", "Suburb"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].raw).toEqual({ Name: "John Doe", Mobile: "0412345678", Address: "123 Main St", Suburb: "Sydney" });
    expect(result.rows[1].raw).toEqual({ Name: "Jane Smith", Mobile: "0487654321", Address: "456 Oak Ave", Suburb: "Melbourne" });
    expect(result.errors).toHaveLength(0);
  });

  it("quoted CSV with commas inside values", () => {
    const csv = `Name,Mobile,Notes
"John, Doe",0412345678,"Has a comma, in name"
Jane Smith,0487654321,Normal notes`;

    const result = parseCSV(csv);

    expect(result.headers).toEqual(["Name", "Mobile", "Notes"]);
    expect(result.rows[0].raw.Name).toBe("John, Doe");
    expect(result.rows[0].raw.Notes).toBe("Has a comma, in name");
    expect(result.rows[1].raw.Name).toBe("Jane Smith");
  });

  it("UTF-8 content with special characters", () => {
    const csv = `Name,Mobile,Suburb
José García,0412345678,Sydney
张三,0487654321,墨尔本`;

    const result = parseCSV(csv);

    expect(result.rows[0].raw.Name).toBe("José García");
    expect(result.rows[1].raw.Suburb).toBe("墨尔本");
  });

  it("CRLF and LF line endings", () => {
    const csv = "Name,Mobile\r\nJohn Doe,0412345678\r\nJane Smith,0487654321\n";
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
  });

  it("blank rows are skipped", () => {
    const csv = `Name,Mobile
John Doe,0412345678

Jane Smith,0487654321
`;

    const result = parseCSV(csv);

    expect(result.rows).toHaveLength(2);
  });

  it("missing header row returns error", () => {
    const csv = "";
    const result = parseCSV(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it("duplicate headers reported as error", () => {
    const csv = `Name,Mobile,Name
John,0412345678,Duplicate`;

    const result = parseCSV(csv);

    expect(result.errors.some((e) => e.includes("Duplicate headers"))).toBe(true);
  });

  it("extra columns beyond limit rejected", () => {
    const headers = Array.from({ length: 51 }, (_, i) => `Col${i}`).join(",");
    const csv = `${headers}\n${"a,".repeat(50)}b`;

    const result = parseCSV(csv);

    expect(result.errors.some((e) => e.includes("Too many columns"))).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it("rows exceeding limit rejected", () => {
    const rows = Array.from({ length: 10001 }, (_, i) => `Name${i},04123456${i % 10}`).join("\n");
    const csv = `Name,Mobile\n${rows}`;

    const result = parseCSV(csv);

    expect(result.errors.some((e) => e.includes("Too many rows"))).toBe(true);
  });

  it("empty file rejected", () => {
    const result = parseCSV("");
    expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
  });
});

describe("parseXLSX", () => {
  it("valid XLSX with first sheet", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Mobile", "Suburb"],
      ["John Doe", "0412345678", "Sydney"],
      ["Jane Smith", "0487654321", "Melbourne"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXLSX(buffer);

    expect(result.headers).toEqual(["Name", "Mobile", "Suburb"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].raw).toEqual({ Name: "John Doe", Mobile: "0412345678", Suburb: "Sydney" });
    expect(result.errors).toHaveLength(0);
  });

  it("workbook with empty first sheet rejected", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Empty");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXLSX(buffer);

    expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("multiple sheets uses first sheet only", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();

    const sheet1 = XLSX.utils.aoa_to_sheet([["Name", "Mobile"], ["Sheet1 Row1", "0412345678"]]);
    const sheet2 = XLSX.utils.aoa_to_sheet([["Name", "Mobile"], ["Sheet2 Row1", "0487654321"]]);

    XLSX.utils.book_append_sheet(workbook, sheet1, "Sheet1");
    XLSX.utils.book_append_sheet(workbook, sheet2, "Sheet2");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXLSX(buffer);

    expect(result.rows[0].raw.Name).toBe("Sheet1 Row1");
    expect(result.rows).toHaveLength(1);
  });

  it("duplicate headers in XLSX reported", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Mobile", "Name"],
      ["John", "0412345678", "Dup"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXLSX(buffer);

    expect(result.errors.some((e) => e.includes("Duplicate headers"))).toBe(true);
  });

  it("unsupported cell values converted to string", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Mobile", "Number", "Boolean", "Date"],
      ["John", "0412345678", 123, true, new Date("2024-01-15")],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXLSX(buffer);

    expect(result.rows[0].raw.Number).toBe("123");
    expect(result.rows[0].raw.Boolean).toBe("TRUE");
    expect(result.rows[0].raw.Date).toBeTruthy();
  });

  it("columns exceeding limit rejected", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const headers = Array.from({ length: 51 }, (_, i) => `Col${i}`);
    const sheet = XLSX.utils.aoa_to_sheet([headers, Array(51).fill("x")]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXLSX(buffer);

    expect(result.errors.some((e) => e.includes("Too many columns"))).toBe(true);
  });

  it("rows exceeding limit rejected", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const rows = [["Name", "Mobile"]];
    for (let i = 0; i < 10001; i++) {
      rows.push([`Name${i}`, "0412345678"]);
    }
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXLSX(buffer);

    expect(result.errors.some((e) => e.includes("Too many rows"))).toBe(true);
  });
});