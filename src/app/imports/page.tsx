"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, X, FileWarning, Users, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  createImportJob,
  parseFile,
  validateRows,
  executeImport,
  readFileAsText,
  readFileAsBase64,
} from "@/lib/client/import-service";
import type { ImportableField, RawRow } from "@/lib/domain/import";

const STEPS = ["Upload", "Map Columns", "Validate", "Assign", "Confirm"] as const;

const FIELD_LABELS: Record<ImportableField, string> = {
  name: "Name",
  mobile: "Mobile",
  address: "Address",
  suburb: "Suburb",
  postcode: "Postcode",
  notes: "Notes",
  renterOwner: "Renter/Owner",
  employmentStatus: "Employment Status",
  superannuation: "Superannuation",
  status: "Lead Status",
  assignedRep: "Assigned Rep",
  source: "Source",
};

const REQUIRED_FIELDS: ImportableField[] = ["name", "mobile"];

export default function ImportsPage() {
  const router = useRouter();
  const { profile, canImportLeads } = useAuth();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, ImportableField | "ignore">>({});
  const [rows, setRows] = useState<RawRow[]>([]);
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [validationSummary, setValidationSummary] = useState({ total: 0, valid: 0, invalid: 0, duplicate: 0, ready: 0 });
  const [office, setOffice] = useState<string>(profile?.primaryOfficeId ?? "perth");
  const [assignmentMode, setAssignmentMode] = useState<"single" | "round-robin" | "none">("none");
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; duplicates: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);

    // Validate file type
    const validTypes = ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const hasValidExtension = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
    const hasValidMime = validTypes.includes(selectedFile.type);

    if (!hasValidExtension && !hasValidMime) {
      setError("Unsupported file type. Please upload a CSV or XLSX file.");
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit. Please upload a smaller file.");
      return;
    }

    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // Create import job
      const id = await createImportJob({
        fileName: file.name,
        fileType: file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx",
        fileSize: file.size,
        officeId: office,
        assignmentMode,
        assignedRepIds: selectedReps,
        source: "csv_import",
      });

      setImportId(id);

      // Parse file
      const isCSV = file.name.toLowerCase().endsWith(".csv");
      let content: string;

      if (isCSV) {
        content = await readFileAsText(file);
      } else {
        content = await readFileAsBase64(file);
      }

      const parseResult = await parseFile(id, content, file.name, isCSV ? "utf-8" : "base64");

      setHeaders(parseResult.headers);
      setSampleRows(parseResult.sampleRows);
      setTotalRows(parseResult.totalRows);

      // Auto-map headers
      const autoMapping: Record<string, ImportableField | "ignore"> = {};
      const headerMap: Record<string, ImportableField> = {
        name: "name", "lead name": "name", "full name": "name", "contact name": "name",
        mobile: "mobile", phone: "mobile", "contact number": "mobile", "phone number": "mobile",
        address: "address", "street address": "address",
        suburb: "suburb", city: "suburb",
        postcode: "postcode", zip: "postcode",
        notes: "notes", comments: "notes",
        renterowner: "renterOwner", "renter owner": "renterOwner",
        employmentstatus: "employmentStatus", "employment status": "employmentStatus",
        superannuation: "superannuation", super: "superannuation",
        status: "status", "lead status": "status",
        assignedrep: "assignedRep", "assigned rep": "assignedRep", rep: "assignedRep", consultant: "assignedRep",
        source: "source", "lead source": "source",
      };

      for (const header of parseResult.headers) {
        const normalized = header.toLowerCase().trim();
        autoMapping[header] = headerMap[normalized] ?? "ignore";
      }

      setMapping(autoMapping);
      setStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    setError(null);

    try {
      const mappedRows: RawRow[] = sampleRows.map((raw, idx) => ({
        rowNumber: idx + 1,
        raw,
      }));

      const result = await validateRows(importId!, { fields: mapping }, mappedRows);
      setValidatedRows(result.rows);
      setRows(mappedRows);
      setValidationSummary({
        total: result.totalRows,
        valid: result.validRows,
        invalid: result.invalidRows,
        duplicate: result.duplicateRows,
        ready: result.readyToImport,
      });
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to validate rows");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsImporting(true);
    setError(null);

    try {
      const result = await executeImport(importId!);
      setImportResult(result);
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to execute import");
    } finally {
      setIsImporting(false);
    }
  };

  const canProceedFromMapping = () => {
    const mappedFields = Object.values(mapping);
    return REQUIRED_FIELDS.every((f) => mappedFields.includes(f));
  };

  if (!canImportLeads) {
    return (
      <div className="animate-fade-in">
        <div className="rounded-xl border border-asg-border bg-white p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-asg-warning" />
          <h2 className="mt-4 text-lg font-semibold text-asg-text">Import Permission Required</h2>
          <p className="mt-2 text-sm text-asg-text-secondary">
            Your role does not have permission to import leads. Please contact your manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="border-b border-asg-border pb-6">
        <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Import Leads</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">Upload a CSV or XLSX file and map it to ASG lead fields.</p>
      </div>

      {/* Progress Stepper */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                i <= step ? "bg-asg-gold text-white" : "bg-asg-border text-asg-text-muted"
              )}>
                {i + 1}
              </div>
              <span className={cn("ml-2 hidden text-sm font-medium sm:block", i <= step ? "text-asg-text" : "text-asg-text-muted")}>{s}</span>
              {i < STEPS.length - 1 && <div className={cn("mx-2 h-px flex-1", i < step ? "bg-asg-gold" : "bg-asg-border")} />}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-asg-danger/20 bg-asg-danger-subtle p-3 text-sm text-asg-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-asg-border bg-white p-6 shadow-sm">
        {/* Step 0: Upload */}
        {step === 0 && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                file ? "border-asg-gold bg-asg-gold-subtle" : "border-asg-border-strong bg-asg-cream hover:border-asg-gold"
              )}
            >
              {file ? <FileSpreadsheet className="h-10 w-10 text-asg-gold-dark" /> : <Upload className="h-10 w-10 text-asg-text-muted" />}
              <p className="mt-4 font-medium text-asg-text">{file ? file.name : "Drag and drop your file here"}</p>
              <p className="mt-1 text-sm text-asg-text-secondary">CSV or XLSX up to 10 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>

            {/* Office Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-asg-text">Office</label>
              <select value={office} onChange={(e) => setOffice(e.target.value)} className="asg-select mt-1">
                <option value="perth">Perth</option>
                <option value="brisbane">Brisbane</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={handleUpload} disabled={!file || loading} className="asg-button-primary">
                {loading ? "Uploading..." : "Upload & Continue"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Map Columns */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-asg-text">Map Columns</h3>
              <span className="text-sm text-asg-text-secondary">{totalRows} rows detected</span>
            </div>

            <div className="space-y-3">
              {headers.map((header) => (
                <div key={header} className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <div>
                    <p className="text-sm font-medium text-asg-text">{header}</p>
                    <p className="text-xs text-asg-text-muted">
                      Sample: {sampleRows[0]?.[header] ?? "—"}
                    </p>
                  </div>
                  <span className="text-center text-asg-gold">→</span>
                  <select
                    value={mapping[header] ?? "ignore"}
                    onChange={(e) => setMapping({ ...mapping, [header]: e.target.value as ImportableField | "ignore" })}
                    className="asg-select"
                  >
                    <option value="ignore">Ignore Column</option>
                    {(Object.keys(FIELD_LABELS) as ImportableField[]).map((field) => (
                      <option key={field} value={field}>{FIELD_LABELS[field]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {!canProceedFromMapping() && (
              <div className="flex items-start gap-2 rounded-lg border border-asg-warning/20 bg-asg-warning-subtle p-3 text-sm text-asg-warning">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Map at least Name and Mobile columns to continue.</p>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(0)} className="asg-button-secondary">Back</button>
              <button onClick={handleValidate} disabled={!canProceedFromMapping() || loading} className="asg-button-primary">
                {loading ? "Validating..." : "Validate Rows"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Validation */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-asg-text">Validation Results</h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-asg-border bg-asg-cream p-4 text-center">
                <p className="text-2xl font-semibold text-asg-text">{validationSummary.total}</p>
                <p className="text-xs font-medium text-asg-text-muted">Total Rows</p>
              </div>
              <div className="rounded-lg border border-asg-border bg-asg-success-subtle p-4 text-center">
                <p className="text-2xl font-semibold text-asg-success">{validationSummary.valid}</p>
                <p className="text-xs font-medium text-asg-success">Valid</p>
              </div>
              <div className="rounded-lg border border-asg-border bg-asg-warning-subtle p-4 text-center">
                <p className="text-2xl font-semibold text-asg-warning">{validationSummary.duplicate}</p>
                <p className="text-xs font-medium text-asg-warning">Duplicates</p>
              </div>
              <div className="rounded-lg border border-asg-border bg-asg-danger-subtle p-4 text-center">
                <p className="text-2xl font-semibold text-asg-danger">{validationSummary.invalid}</p>
                <p className="text-xs font-medium text-asg-danger">Invalid</p>
              </div>
            </div>

            {/* Row details */}
            <div className="max-h-60 overflow-y-auto rounded-lg border border-asg-border">
              <table className="w-full text-sm">
                <thead className="bg-asg-cream">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Row</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Mobile</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedRows.slice(0, 50).map((row: any) => (
                    <tr key={row.rowNumber} className="border-t border-asg-border">
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.mapped?.name ?? "—"}</td>
                      <td className="px-3 py-2">{row.mapped?.mobile ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          row.status === "valid" && "text-asg-success",
                          row.status === "invalid" && "text-asg-danger",
                          row.status === "duplicate" && "text-asg-warning",
                        )}>
                          {row.status === "valid" && <CheckCircle2 className="h-3 w-3" />}
                          {row.status === "invalid" && <X className="h-3 w-3" />}
                          {row.status === "duplicate" && <FileWarning className="h-3 w-3" />}
                          {row.status}
                        </span>
                        {row.errors?.length > 0 && (
                          <p className="mt-0.5 text-xs text-asg-text-muted">{row.errors.join(", ")}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="asg-button-secondary">Back</button>
              <button onClick={() => setStep(3)} disabled={validationSummary.valid === 0} className="asg-button-primary">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Assign */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-asg-text">Assignment</h3>

            <div>
              <label className="block text-sm font-medium text-asg-text">Office</label>
              <select value={office} onChange={(e) => setOffice(e.target.value)} className="asg-select mt-1">
                <option value="perth">Perth</option>
                <option value="brisbane">Brisbane</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-asg-text">Assignment Mode</label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 rounded-lg border border-asg-border p-3">
                  <input
                    type="radio"
                    name="assign"
                    checked={assignmentMode === "none"}
                    onChange={() => setAssignmentMode("none")}
                    className="text-asg-gold focus:ring-asg-gold"
                  />
                  <span className="text-sm text-asg-text">Leave unassigned</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-asg-border p-3">
                  <input
                    type="radio"
                    name="assign"
                    checked={assignmentMode === "round-robin"}
                    onChange={() => setAssignmentMode("round-robin")}
                    className="text-asg-gold focus:ring-asg-gold"
                  />
                  <span className="text-sm text-asg-text">Round-robin between reps</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-asg-border p-3">
                  <input
                    type="radio"
                    name="assign"
                    checked={assignmentMode === "single"}
                    onChange={() => setAssignmentMode("single")}
                    className="text-asg-gold focus:ring-asg-gold"
                  />
                  <span className="text-sm text-asg-text">Assign all to one rep</span>
                </label>
              </div>
            </div>

            {(assignmentMode === "round-robin" || assignmentMode === "single") && (
              <div>
                <label className="block text-sm font-medium text-asg-text">
                  {assignmentMode === "single" ? "Select Rep" : "Select Reps (Round-Robin Order)"}
                </label>
                <p className="mt-1 text-xs text-asg-text-muted">
                  Rep list filtered to active {office} reps.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(2)} className="asg-button-secondary">Back</button>
              <button onClick={() => setStep(4)} className="asg-button-primary">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm / Result */}
        {step === 4 && !importResult && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-asg-gold-subtle">
              <CheckCircle2 className="h-8 w-8 text-asg-gold-dark" />
            </div>
            <h3 className="text-lg font-semibold text-asg-text">Ready to Import</h3>
            <p className="text-sm text-asg-text-secondary">
              {validationSummary.ready} valid leads will be imported into {office}.
            </p>
            <div className="rounded-lg border border-asg-border bg-asg-cream p-4 text-left text-sm">
              <p className="flex justify-between py-1"><span className="text-asg-text-secondary">Filename</span> <span className="font-medium text-asg-text">{file?.name}</span></p>
              <p className="flex justify-between py-1"><span className="text-asg-text-secondary">Office</span> <span className="font-medium text-asg-text">{office}</span></p>
              <p className="flex justify-between py-1"><span className="text-asg-text-secondary">Valid Rows</span> <span className="font-medium text-asg-text">{validationSummary.ready}</span></p>
              <p className="flex justify-between py-1"><span className="text-asg-text-secondary">Duplicates</span> <span className="font-medium text-asg-text">{validationSummary.duplicate}</span></p>
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(3)} className="asg-button-secondary">Back</button>
              <button onClick={handleExecute} disabled={isImporting} className="asg-button-primary">
                {isImporting ? "Importing..." : "Confirm Import"}
                {!isImporting && <CheckCircle2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && importResult && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-asg-success-subtle">
              <CheckCircle2 className="h-8 w-8 text-asg-success" />
            </div>
            <h3 className="text-lg font-semibold text-asg-text">Import Complete</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-asg-border bg-asg-success-subtle p-4 text-center">
                <p className="text-2xl font-semibold text-asg-success">{importResult.imported}</p>
                <p className="text-xs font-medium text-asg-success">Imported</p>
              </div>
              <div className="rounded-lg border border-asg-border bg-asg-warning-subtle p-4 text-center">
                <p className="text-2xl font-semibold text-asg-warning">{importResult.duplicates}</p>
                <p className="text-xs font-medium text-asg-warning">Duplicates</p>
              </div>
              <div className="rounded-lg border border-asg-border bg-asg-danger-subtle p-4 text-center">
                <p className="text-2xl font-semibold text-asg-danger">{importResult.failed}</p>
                <p className="text-xs font-medium text-asg-danger">Failed</p>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => router.push("/imports/history")} className="asg-button-secondary">
                View History
              </button>
              <button onClick={() => window.location.reload()} className="asg-button-primary">
                New Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}