import { cn } from "@/lib/utils";
import { statusConfig } from "@/lib/mock-data";

/** Humanize a raw status value ("wrong_number" → "Wrong Number"). */
export function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.trim().toLowerCase().replace(/_/g, " ");

  const config =
    Object.entries(statusConfig).find(
      ([key]) => key.toLowerCase().replace(/_/g, " ") === normalized
    )?.[1] ?? {
      bg: "bg-asg-cream",
      text: "text-asg-text-secondary",
      border: "border-asg-border",
    };

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
