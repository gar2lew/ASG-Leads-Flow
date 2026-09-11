import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-asg-border-strong bg-asg-cream px-6 py-16 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-asg-border bg-white">
        <Icon className="h-5 w-5 text-asg-gold-dark" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-asg-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-asg-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
