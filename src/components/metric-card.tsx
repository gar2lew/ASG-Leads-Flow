import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  accent?: "gold" | "navy" | "success" | "danger";
}

export function MetricCard({ icon: Icon, label, value, trend, trendUp, className, accent = "gold" }: MetricCardProps) {
  const accentStyles = {
    gold: "bg-asg-gold-subtle text-asg-gold-dark",
    navy: "bg-asg-navy/10 text-asg-navy",
    success: "bg-asg-success-subtle text-asg-success",
    danger: "bg-asg-danger-subtle text-asg-danger",
  };

  return (
    <div className={cn("asg-card p-5 transition-shadow hover:shadow-md", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-asg-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-asg-text">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trendUp ? "text-asg-success" : "text-asg-danger")}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", accentStyles[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
