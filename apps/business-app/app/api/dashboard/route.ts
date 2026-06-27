/**
 * GET /api/dashboard — aggregated dashboard metrics
 *
 * Fetches all batches and their computed totals, then aggregates
 * the data for the dashboard overview. This avoids N+1 from the
 * client perspective by doing all fetches server-side.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ProductionBatch, ProductionBatchWithTotals } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

export interface DashboardTotals {
  batchCount: number;
  totalItems: number;
  expectedRevenue: number;
  actualRevenue: number;
  expectedProfit: number;
  profitSoFar: number;
}

export interface DashboardData {
  batches: ProductionBatch[];
  totals: DashboardTotals;
}

export async function GET() {
  // Read session cookie
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  if (!sessionValue) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }
  const cookie = `printsbytee_session=${sessionValue}`;

  // Fetch all batches
  const batchesResult = await getJson<ProductionBatch[]>("/batches", cookie);

  if (!batchesResult.ok) {
    if ("error" in batchesResult) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: batchesResult.message } },
        { status: 502 }
      );
    }
    return NextResponse.json(batchesResult.body, { status: batchesResult.status });
  }

  const batches = batchesResult.data;

  // If no batches, return empty totals
  if (batches.length === 0) {
    return NextResponse.json(
      {
        batches: [],
        totals: {
          batchCount: 0,
          totalItems: 0,
          expectedRevenue: 0,
          actualRevenue: 0,
          expectedProfit: 0,
          profitSoFar: 0,
        },
      },
      { status: 200 }
    );
  }

  // Fetch each batch's details to get computed totals
  const batchPromises = batches.map((batch) =>
    getJson<ProductionBatchWithTotals>(`/batches/${batch.id}`, cookie)
  );
  const results = await Promise.allSettled(batchPromises);

  // Aggregate totals
  const totals: DashboardTotals = {
    batchCount: batches.length,
    totalItems: 0,
    expectedRevenue: 0,
    actualRevenue: 0,
    expectedProfit: 0,
    profitSoFar: 0,
  };

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.ok) {
      const data = result.value.data;
      totals.totalItems += data.totals.itemCount;
      totals.expectedRevenue += data.totals.expectedRevenue;
      totals.actualRevenue += data.totals.actualRevenue;
      totals.expectedProfit += data.totals.expectedProfit;
      totals.profitSoFar += data.totals.profitSoFar;
    }
  }

  return NextResponse.json({ batches, totals }, { status: 200 });
}
