"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Upload", "Map Columns", "Validate", "Assign", "Confirm"];

export default function ImportsPage() {
  const router = useRouter();
  const { currentUser, addImportJob } = useApp();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState({ name: "First Name", mobile: "Phone", address: "Street Address", rep: "Consultant", notes: "Comments" });
  const [office, setOffice] = useState<"Perth" | "Brisbane">(currentUser.office === "All" ? "Perth" : (currentUser.office as "Perth" | "Brisbane"));
  const [assignTo, setAssignTo] = useState("round-robin");
  const [isImporting, setIsImporting] = useState(false);

  const validation = {
    total: 327,
    valid: 312,
    duplicates: 8,
    invalid: 4,
    missingPhone: 3,
  };

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      addImportJob({
        id: `i-${Date.now()}`,
        filename: file?.name || "import.csv",
        office: office as any,
        rep: currentUser.name,
        totalRecords: validation.valid,
        validRecords: validation.valid,
        duplicates: validation.duplicates,
        invalid: validation.invalid,
        status: "Completed",
        createdAt: new Date().toISOString(),
      });
      setIsImporting(false);
      router.push("/imports/history");
    }, 1500);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="border-b border-asg-border pb-6">
        <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Import Leads</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">Upload a CSV or XLSX file and map it to ASG lead fields.</p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                i <= step ? "bg-asg-gold text-white" : "bg-asg-border text-asg-text-muted"
              )}>
                {i + 1}
              </div>
              <span className={cn("ml-2 hidden text-sm font-medium sm:block", i <= step ? "text-asg-text" : "text-asg-text-muted")}>{s}</span>
              {i < steps.length - 1 && <div className={cn("mx-2 h-px flex-1", i < step ? "bg-asg-gold" : "bg-asg-border")} />}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-asg-border bg-white p-6 shadow-sm">
          {step === 0 && (
            <div>
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                  file ? "border-asg-gold bg-asg-gold-subtle" : "border-asg-border-strong bg-asg-cream hover:border-asg-gold"
                )}
              >
                {file ? <FileSpreadsheet className="h-10 w-10 text-asg-gold-dark" /> : <Upload className="h-10 w-10 text-asg-text-muted" />}
                <p className="mt-4 font-medium text-asg-text">{file ? file.name : "Drag and drop your file here"}</p>
                <p className="mt-1 text-sm text-asg-text-secondary">CSV or XLSX up to 10MB</p>
                <button
                  onClick={() => setFile(new File([""], "september-campaign-leads.csv", { type: "text/csv" }))}
                  className="mt-5 asg-button-secondary"
                >
                  {file ? "Change File" : "Select File"}
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-asg-text">Map Columns</h3>
              {Object.entries(mapping).map(([field, value]) => (
                <div key={field} className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <input value={value} readOnly className="asg-input bg-asg-cream" />
                  <span className="text-center text-asg-gold">→</span>
                  <div className="rounded-lg border border-asg-border bg-asg-gold-subtle px-3 py-2.5 text-sm font-medium text-asg-gold-dark">
                    {field === "name" ? "Lead Name" : field === "mobile" ? "Contact Number" : field === "address" ? "Address" : field === "rep" ? "Assigned Rep" : "Notes"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-asg-text">Validation Results</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ValidationCard label="Total Records" value={validation.total} />
                <ValidationCard label="Valid" value={validation.valid} color="success" />
                <ValidationCard label="Duplicates" value={validation.duplicates} color="warning" />
                <ValidationCard label="Invalid Rows" value={validation.invalid} color="danger" />
              </div>
              {validation.duplicates > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-asg-warning/20 bg-asg-warning-subtle p-3 text-sm text-asg-warning">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <p>8 duplicate phone numbers detected. You can review and merge these before importing.</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-asg-text">Assignment</h3>
              <div>
                <label className="block text-sm font-medium text-asg-text">Office</label>
                <select value={office} onChange={(e) => setOffice(e.target.value as "Perth" | "Brisbane")} className="asg-select mt-1">
                  <option value="Perth">Perth</option>
                  <option value="Brisbane">Brisbane</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-asg-text">Assign To</label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 rounded-lg border border-asg-border p-3">
                    <input type="radio" name="assign" value="round-robin" checked={assignTo === "round-robin"} onChange={() => setAssignTo("round-robin")} className="text-asg-gold focus:ring-asg-gold" />
                    <span className="text-sm text-asg-text">Round-robin between selected reps</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-asg-border p-3">
                    <input type="radio" name="assign" value="me" checked={assignTo === "me"} onChange={() => setAssignTo("me")} className="text-asg-gold focus:ring-asg-gold" />
                    <span className="text-sm text-asg-text">Assign all to me</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-asg-gold-subtle">
                <CheckCircle2 className="h-8 w-8 text-asg-gold-dark" />
              </div>
              <h3 className="text-lg font-semibold text-asg-text">Ready to Import</h3>
              <p className="text-sm text-asg-text-secondary">
                {validation.valid} valid leads will be imported into {office}.
              </p>
              <div className="rounded-lg border border-asg-border bg-asg-cream p-4 text-left text-sm">
                <p className="flex justify-between py-1"><span className="text-asg-text-secondary">Filename</span> <span className="font-medium text-asg-text">{file?.name || "import.csv"}</span></p>
                <p className="flex justify-between py-1"><span className="text-asg-text-secondary">Office</span> <span className="font-medium text-asg-text">{office}</span></p>
                <p className="flex justify-between py-1"><span className="text-asg-text-secondary">Assignment</span> <span className="font-medium text-asg-text">{assignTo === "round-robin" ? "Round-robin" : "Me"}</span></p>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="asg-button-secondary">Back</button>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="asg-button-primary">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleImport} disabled={isImporting} className="asg-button-primary">
                {isImporting ? "Importing..." : "Confirm Import"}
                {!isImporting && <CheckCircle2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidationCard({ label, value, color = "default" }: { label: string; value: number; color?: "default" | "success" | "warning" | "danger" }) {
  const styles = {
    default: "bg-asg-cream text-asg-text",
    success: "bg-asg-success-subtle text-asg-success",
    warning: "bg-asg-warning-subtle text-asg-warning",
    danger: "bg-asg-danger-subtle text-asg-danger",
  };

  return (
    <div className={cn("rounded-lg border border-asg-border p-4 text-center", styles[color])}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}
