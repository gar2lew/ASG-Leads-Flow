"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, CheckCircle2, AlertCircle, X, FileWarning, Calendar, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getImportDetail } from "@/lib/client/import-service";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "text-asg-info",
  mapping: "text-asg-info",
  validated: "text-asg-gold-dark",
  importing: "text-asg-info",
  completed: "text-asg-success",
  completed_with_errors: "text-asg-warning",
  failed: "text-asg-danger",
  cancelled: "text-asg-text-muted",
};

const ROW_STATUS_STYLES: Record<string, string> = {
  valid: "text-asg-success",
  invalid: "text-asg-danger",
  duplicate: "text-asg-warning",
  imported: "text-asg-success",
  failed: "text-asg-danger",
  skipped: "text-asg-text-muted",
  pending: "text-asg-text-muted",
};

export default function ImportDetailPage() {
  const params = useParams();
  const importId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getImportDetail(importId);
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load import");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [importId]);

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-12">
        <div className="text-asg-text-muted">Loading import details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in">
        <div className="rounded-xl border border-asg-danger/20 bg-asg-danger-subtle p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-asg-danger" />
          <h2 className="mt-4 text-lg font-semibold text-asg-text">{error || "Import not found"}</h2>
          <Link href="/imports/history" className="mt-3 inline-block asg-button-secondary">
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link href="/imports/history" className="inline-flex items-center gap-1 text-sm font-medium text-asg-text-secondary hover:text-asg-gold-dark">
        <ArrowLeft className="h-4 w-4" /> Back to Import History
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <FileSpreadsheet className="h-6 w-6 text-asg-gold" />
        <h1 className="text-2xl font-semibold text-asg-text">{data.fileName}</h1>
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", STATUS_STYLES[data.status] || "text-asg-text-muted")}>
          {data.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-asg-border bg-white p-4">
          <p className="text-sm text-asg-text-secondary">Total Rows</p>
          <p className="mt-1 text-xl font-semibold text-asg-text">{data.totalRows}</p>
        </div>
        <div className="rounded-lg border border-asg-border bg-white p-4">
          <p className="text-sm text-asg-text-secondary">Imported</p>
          <p className="mt-1 text-xl font-semibold text-asg-success">{data.importedRows}</p>
        </div>
        <div className="rounded-lg border border-asg-border bg-white p-4">
          <p className="text-sm text-asg-text-secondary">Duplicates</p>
          <p className="mt-1 text-xl font-semibold text-asg-warning">{data.duplicateRows}</p>
        </div>
        <div className="rounded-lg border border-asg-border bg-white p-4">
          <p className="text-sm text-asg-text-secondary">Failed</p>
          <p className="mt-1 text-xl font-semibold text-asg-danger">{data.failedRows}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-6 rounded-xl border border-asg-border bg-white p-5">
        <h2 className="font-semibold text-asg-text">Import Details</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-asg-text-muted" />
            <span className="text-asg-text-secondary">Created:</span>
            <span className="text-asg-text">{new Date(data.createdAt).toLocaleString("en-AU")}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-asg-text-muted" />
            <span className="text-asg-text-secondary">Office:</span>
            <span className="text-asg-text capitalize">{data.officeId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-asg-text-secondary">Assignment:</span>
            <span className="text-asg-text">{data.assignmentMode.replace(/-/g, " ")}</span>
          </div>
          {data.completedAt && (
            <div className="flex items-center gap-2">
              <span className="text-asg-text-secondary">Completed:</span>
              <span className="text-asg-text">{new Date(data.completedAt).toLocaleString("en-AU")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rows */}
      {data.rows && data.rows.length > 0 && (
        <div className="mt-6 rounded-xl border border-asg-border bg-white shadow-sm">
          <div className="border-b border-asg-border px-5 py-4">
            <h2 className="font-semibold text-asg-text">Row Results</h2>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-asg-cream sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Mobile</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row: any) => (
                  <tr key={row.rowId} className="border-t border-asg-border">
                    <td className="px-4 py-2 text-asg-text-muted">{row.rowNumber}</td>
                    <td className="px-4 py-2">{row.mapped?.name ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.normalizedMobile ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", ROW_STATUS_STYLES[row.status] || "text-asg-text-muted")}>
                        {row.status === "imported" && <CheckCircle2 className="h-3 w-3" />}
                        {row.status === "failed" && <X className="h-3 w-3" />}
                        {row.status === "duplicate" && <FileWarning className="h-3 w-3" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-asg-text-muted">
                      {row.errors?.length > 0 && <span className="text-asg-danger">{row.errors.join(", ")}</span>}
                      {row.createdLeadId && <span className="text-asg-success">Lead: {row.createdLeadId}</span>}
                      {row.duplicateLeadId && !row.createdLeadId && <span className="text-asg-warning">Dup: {row.duplicateLeadId}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}