/**
 * KPI Card — displays a single key performance indicator.
 */

import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}

export function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
}: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        {/* Icon background decoration */}
        <div className="absolute right-4 top-4 opacity-10">
          <Icon className="size-20" strokeWidth={1} />
        </div>

        <div className="relative">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-heading font-bold tracking-tight">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          {trend && trendLabel && (
            <div className="mt-3 flex items-center gap-1 text-sm">
              {trend === "up" && (
                <span className="text-emerald-700">↑ {trendLabel}</span>
              )}
              {trend === "down" && (
                <span className="text-destructive">↓ {trendLabel}</span>
              )}
              {trend === "neutral" && (
                <span className="text-muted-foreground">→ {trendLabel}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
