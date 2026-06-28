/**
 * Batch list page — Server Component.
 *
 * Fetches all batches from the API. Totals (item count, revenue, profit)
 * live on the detail page — the list view shows batch identity + cost
 * only, matching the `ProductionBatch` contract returned by `GET /batches`.
 *
 * The auth gate in (protected)/layout.tsx ensures a valid session.
 */

import Link from "next/link";
import { cookies } from "next/headers";
import type { ProductionBatch } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { BatchList } from "@/components/batches/batch-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Batches — PrintsbyTee Business",
};

export default async function BatchesPage() {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  const cookie = sessionValue ? `printsbytee_session=${sessionValue}` : undefined;

  const result = await getJson<ProductionBatch[]>("/batches", cookie);

  // Distinguish failures from the genuine empty state so the route-level
  // error boundary can render the appropriate UI instead of a misleading
  // "No batches yet" message.
  if (!result.ok || result.status !== 200) {
    if ("error" in result) {
      throw new Error(`Failed to load batches: ${result.message}`);
    }
    throw new Error(
      `Failed to load batches (HTTP ${result.status})`
    );
  }

  const batches = result.data;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Batches</h1>
        <Link href="/batches/new">
          <Button>New batch</Button>
        </Link>
      </div>

      <BatchList batches={batches} />
    </div>
  );
}
