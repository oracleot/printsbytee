/**
 * Batch list page — Server Component.
 *
 * Fetches all batches with computed totals from the API.
 * The auth gate in (protected)/layout.tsx ensures a valid session.
 */

import { cookies } from "next/headers";
import type { ProductionBatchWithTotals } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { BatchList } from "@/components/batches/batch-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Batches — PrintsbyTee Business",
};

export default async function BatchesPage() {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  const cookie = sessionValue ? `printsbytee_session=${sessionValue}` : undefined;

  const result = await getJson<ProductionBatchWithTotals[]>("/batches", cookie);

  const batches: ProductionBatchWithTotals[] =
    result.ok && result.status === 200 ? result.data : [];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Batches</h1>
      </div>

      <BatchList batches={batches} />
    </div>
  );
}
