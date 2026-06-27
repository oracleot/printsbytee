/**
 * Dashboard — server component.
 *
 * Shows the business overview with:
 * - KPI cards (batches count, expected profit, profit so far)
 * - Recent batches list
 * - Profit overview card
 *
 * The auth gate in (protected)/layout.tsx ensures a valid session.
 */

import type { Metadata } from "next";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { cookies } from "next/headers";
import type { ProductionBatch } from "@printsbytee/shared";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BatchesSummary } from "@/components/dashboard/batches-summary";
import { ProfitOverview } from "@/components/dashboard/profit-overview";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { PackageIcon, TrendingUpIcon, DollarSignIcon } from "lucide-react";
import type { DashboardData, DashboardTotals } from "@/app/api/dashboard/route";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — PrintsbyTee Business",
};

function formatCurrency(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

async function getDashboardData(): Promise<{
  batches: ProductionBatch[];
  totals: DashboardTotals;
} | null> {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  if (!sessionValue) return null;

  const cookie = `printsbytee_session=${sessionValue}`;
  const result = await getJson<DashboardData>("/api/dashboard", cookie);

  if (!result.ok || result.status === 401) {
    return null;
  }

  return result.data;
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  // Show loading skeleton while checking auth
  if (data === null) {
    return <DashboardSkeleton />;
  }

  const { batches, totals } = data;

  return (
    <div className="w-full space-y-8">
      {/* Page header */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-heading font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Track your production batches and sales performance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Batches"
          value={String(totals.batchCount)}
          description={`${totals.totalItems} items total`}
          icon={PackageIcon}
        />
        <KpiCard
          label="Expected Profit"
          value={formatCurrency(totals.expectedProfit)}
          description="At full sell-through"
          icon={TrendingUpIcon}
        />
        <KpiCard
          label="Profit So Far"
          value={formatCurrency(totals.profitSoFar)}
          description={
            totals.expectedProfit > 0
              ? `${Math.round((totals.profitSoFar / totals.expectedProfit) * 100)}% realized`
              : "No sales yet"
          }
          icon={DollarSignIcon}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BatchesSummary batches={batches} />
        <ProfitOverview totals={totals} batchCount={totals.batchCount} />
      </div>
    </div>
  );
}
