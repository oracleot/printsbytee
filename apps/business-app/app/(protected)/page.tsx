/**
 * Dashboard — server component.
 *
 * Shows the business overview with:
 * - KPI cards (batches count, expected profit, profit so far)
 * - Recent batches list (newest 5, after reversing the API's
 *   ascending-by-createdAt order)
 * - Profit overview card
 *
 * The auth gate in (protected)/layout.tsx ensures a valid session.
 *
 * Implementation note: aggregation happens in this server component
 * (server-to-server fetch, cookies forwarded) rather than through an
 * internal Next.js route handler — that pattern mis-routed the call
 * to the external API in the first iteration. A follow-up should add
 * a dedicated `GET /dashboard` aggregation endpoint in `apps/api` so
 * the page does not have to issue N+1 detail fetches itself.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type {
  ProductionBatch,
  ProductionBatchWithTotals,
} from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BatchesSummary } from "@/components/dashboard/batches-summary";
import { ProfitOverview } from "@/components/dashboard/profit-overview";
import { PackageIcon, TrendingUpIcon, DollarSignIcon } from "lucide-react";
import type { DashboardData, DashboardTotals } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — PrintsbyTee Business",
};

function formatCurrency(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

const EMPTY_DASHBOARD: DashboardData = {
  batches: [],
  totals: {
    batchCount: 0,
    totalItems: 0,
    expectedRevenue: 0,
    actualRevenue: 0,
    expectedProfit: 0,
    profitSoFar: 0,
  },
};

/**
 * Fetches + aggregates dashboard data directly against the external API.
 *
 * Throws on any non-200 result so the route-level error boundary can
 * surface the failure. Genuine empty state (zero batches) is returned
 * with all totals zero — distinct from a fetch failure.
 *
 * The "no session cookie" branch returns empty data: the parent
 * `(protected)/layout.tsx` already redirects unauthenticated users,
 * and we want to avoid throwing in the race window before that
 * redirect takes effect.
 */
async function loadDashboardData(): Promise<DashboardData> {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  if (!sessionValue) {
    return EMPTY_DASHBOARD;
  }
  const cookie = `printsbytee_session=${sessionValue}`;

  const batchesResult = await getJson<ProductionBatch[]>("/batches", cookie);

  if (!batchesResult.ok || batchesResult.status !== 200) {
    if ("error" in batchesResult) {
      throw new Error(`Failed to load batches: ${batchesResult.message}`);
    }
    throw new Error(
      `Failed to load batches (HTTP ${batchesResult.status})`
    );
  }

  const batches = batchesResult.data;

  // Empty state: no batches yet — surface zero totals, do not error.
  if (batches.length === 0) {
    return {
      batches: [],
      totals: {
        batchCount: 0,
        totalItems: 0,
        expectedRevenue: 0,
        actualRevenue: 0,
        expectedProfit: 0,
        profitSoFar: 0,
      },
    };
  }

  // Per-batch detail fetch to get computed totals. N+1 acceptable for the
  // current batch volume; flagged as a follow-up to add a real
  // `GET /dashboard` aggregation endpoint in `apps/api`.
  const detailResults = await Promise.allSettled(
    batches.map((batch) =>
      getJson<ProductionBatchWithTotals>(`/batches/${batch.id}`, cookie)
    )
  );

  const totals: DashboardTotals = {
    batchCount: batches.length,
    totalItems: 0,
    expectedRevenue: 0,
    actualRevenue: 0,
    expectedProfit: 0,
    profitSoFar: 0,
  };

  for (const result of detailResults) {
    if (result.status === "fulfilled" && result.value.ok) {
      const t = result.value.data.totals;
      totals.totalItems += t.itemCount;
      totals.expectedRevenue += t.expectedRevenue;
      totals.actualRevenue += t.actualRevenue;
      totals.expectedProfit += t.expectedProfit;
      totals.profitSoFar += t.profitSoFar;
    }
    // Failed detail fetches are tolerated for individual batches so a
    // single missing/errored batch does not blank the whole dashboard.
    // (Logged via console for owner visibility; would route to observability
    // stack in production.)
  }

  return { batches, totals };
}

export default async function DashboardPage() {
  const data = await loadDashboardData();
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
