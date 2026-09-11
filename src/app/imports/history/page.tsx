"use client";

import { useApp } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { FileSpreadsheet, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImportHistoryPage() {
  const { importJobs } = useApp();

  return (
    <div className="animate-fade-in">
      <div className="border-b border-asg-border pb-6">
        <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Import History</h1>
        <p className="mt-1 text-sm text-asg-text-secondary">Review previous lead imports and their results.</p>
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-xl border border-asg-border bg-white shadow-sm lg:block">
        <table className="asg-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Office</th>
              <th>Imported By</th>
              <th>Total</th>
              <th>Valid</th>
              <th>Duplicates</th>
              <th>Invalid</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {importJobs.map((job) => (
              <tr key={job.id}>
                <td className="font-medium text-asg-text">{job.filename}</td>
                <td>{job.office}</td>
                <td>{job.rep}</td>
                <td>{job.totalRecords}</td>
                <td className="text-asg-success">{job.validRecords}</td>
                <td className="text-asg-warning">{job.duplicates}</td>
                <td className="text-asg-danger">{job.invalid}</td>
                <td><ImportStatus status={job.status} /></td>
                <td>{new Date(job.createdAt).toLocaleDateString("en-AU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {importJobs.length === 0 && (
          <div className="px-6 py-12">
            <EmptyState icon={FileSpreadsheet} title="No import history" description="Imports will appear here once completed." />
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3 lg:hidden">
        {importJobs.map((job) => (
          <div key={job.id} className="asg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-asg-gold" />
                <p className="font-medium text-asg-text">{job.filename}</p>
              </div>
              <ImportStatus status={job.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-asg-text-secondary">
              <p>{job.office}</p>
              <p>{job.rep}</p>
              <p>{job.totalRecords} total</p>
              <p>{job.validRecords} valid</p>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-asg-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(job.createdAt).toLocaleDateString("en-AU")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportStatus({ status }: { status: string }) {
  const styles = {
    Pending: "text-asg-warning",
    Processing: "text-asg-info",
    Completed: "text-asg-success",
    Failed: "text-asg-danger",
  };

  const icons = {
    Pending: Clock,
    Processing: Clock,
    Completed: CheckCircle2,
    Failed: AlertCircle,
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", styles[status as keyof typeof styles] || "text-asg-text-muted")}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}
