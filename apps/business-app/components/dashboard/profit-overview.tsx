/**
 * Profit Overview Card — displays aggregate profit metrics.
 *
 * Data is fetched and aggregated at the page level (server component).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon, DollarSignIcon } from "lucide-react";
import type { DashboardTotals } from "@/lib/dashboard-types";

interface ProfitOverviewProps {
  totals: DashboardTotals;
  batchCount: number;
}

export function ProfitOverview({ totals, batchCount }: ProfitOverviewProps) {
  function formatCurrency(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`;
  }

  const loss = Math.max(0, totals.expectedRevenue - totals.actualRevenue);
  const profitProgress =
    totals.expectedProfit > 0
      ? Math.round((totals.profitSoFar / totals.expectedProfit) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expected Profit */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-secondary/10">
              <TrendingUpIcon className="size-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium">Expected Profit</p>
              <p className="text-xs text-muted-foreground">
                {totals.totalItems} items across {batchCount} batches
              </p>
            </div>
          </div>
          <p className="text-xl font-bold">{formatCurrency(totals.expectedProfit)}</p>
        </div>

        {/* Profit So Far */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent/10">
              <DollarSignIcon className="size-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium">Profit So Far</p>
              <p className="text-xs text-muted-foreground">
                {totals.actualRevenue > 0
                  ? `${profitProgress}% of expected`
                  : "No sales yet"}
              </p>
            </div>
          </div>
          <p className="text-xl font-bold">{formatCurrency(totals.profitSoFar)}</p>
        </div>

        {/* Loss (if any) */}
        {loss > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <TrendingDownIcon className="size-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Unrealised Loss</p>
                <p className="text-xs text-muted-foreground">
                  Unsold items at risk
                </p>
              </div>
            </div>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(loss)}
            </p>
          </div>
        )}

        {/* Revenue breakdown */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Revenue Breakdown
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Expected</p>
              <p className="font-medium">{formatCurrency(totals.expectedRevenue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual</p>
              <p className="font-medium">{formatCurrency(totals.actualRevenue)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
