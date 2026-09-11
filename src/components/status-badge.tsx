import { cn } from "@/lib/utils";
import { statusConfig } from "@/lib/mock-data";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    bg: "bg-asg-cream",
    text: "text-asg-text-secondary",
    border: "border-asg-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {status}
    </span>
  );
}
