"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { FileSpreadsheet, Calendar, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { listImportJobs } from "@/lib/client/import-service";

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

const STATUS_ICONS: Record<string, any> = {
  uploaded: Clock,
  mapping: Clock,
  validated: Clock,
  importing: Clock,
  completed: CheckCircle2,
  completed_with_errors: AlertCircle,
  failed: AlertCircle,
  cancelled: AlertCircle,
};

export default function ImportHistoryPage() {
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchImports() {
      try {
        const result = await listImportJobs({ limit: 50 });
        setImports(result);
      } catch (err: any) {
        setError(err.message || "Failed to load import history");
      } finally {
        setLoading(false);
      }
    }
    fetchImports();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-12">
        <div className="text-asg-text-muted">Loading import history...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between border-b border-asg-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Import History</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Review previous lead imports and their results.</p>
        </div>
        <Link href="/imports" className="asg-button-primary">
          New Import
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-asg-danger/20 bg-asg-danger-subtle p-3 text-sm text-asg-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-6 hidden overflow-hidden rounded-xl border border-asg-border bg-white shadow-sm lg:block">
        <table className="asg-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Office</th>
              <th>Total</th>
              <th>Imported</th>
              <th>Duplicates</th>
              <th>Failed</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {imports.map((job) => {
              const Icon = STATUS_ICONS[job.status] || Clock;
              return (
                <tr key={job.importId}>
                  <td className="font-medium text-asg-text">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-asg-gold" />
                      {job.fileName}
                    </div>
                  </td>
                  <td className="capitalize">{job.officeId}</td>
                  <td>{job.totalRows}</td>
                  <td className="text-asg-success">{job.importedRows}</td>
                  <td className="text-asg-warning">{job.duplicateRows}</td>
                  <td className="text-asg-danger">{job.failedRows}</td>
                  <td>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", STATUS_STYLES[job.status] || "text-asg-text-muted")}>
                      <Icon className="h-3.5 w-3.5" />
                      {job.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-xs text-asg-text-muted">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(job.createdAt).toLocaleDateString("en-AU")}
                    </span>
                  </td>
                  <td>
                    <Link href={`/imports/${job.importId}`} className="text-asg-gold hover:text-asg-gold-dark">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {imports.length === 0 && (
          <div className="px-6 py-12">
            <EmptyState icon={FileSpreadsheet} title="No import history" description="Imports will appear here once completed." />
          </div>
        )}
      </div>

      {/* Mobile view */}
      <div className="mt-6 space-y-3 lg:hidden">
        {imports.map((job) => {
          const Icon = STATUS_ICONS[job.status] || Clock;
          return (
            <Link key={job.importId} href={`/imports/${job.importId}`} className="block asg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-asg-gold" />
                  <p className="font-medium text-asg-text">{job.fileName}</p>
                </div>
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium", STATUS_STYLES[job.status] || "text-asg-text-muted")}>
                  <Icon className="h-3.5 w-3.5" />
                  {job.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-asg-text-secondary">
                <p className="capitalize">{job.officeId}</p>
                <p>{job.totalRows} total</p>
                <p>{job.importedRows} imported</p>
                <p>{job.duplicateRows} duplicates</p>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-asg-text-muted">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(job.createdAt).toLocaleDateString("en-AU")}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}