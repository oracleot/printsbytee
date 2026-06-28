/**
 * Dashboard types — shared between the dashboard page and its
 * sub-components. Kept in `lib/` (not co-located with any single
 * component or route handler) so a future move of the aggregation
 * endpoint does not break the component tree.
 */

export interface DashboardTotals {
  batchCount: number;
  totalItems: number;
  expectedRevenue: number;
  actualRevenue: number;
  expectedProfit: number;
  profitSoFar: number;
}

export interface DashboardData {
  batches: import("@printsbytee/shared").ProductionBatch[];
  totals: DashboardTotals;
}