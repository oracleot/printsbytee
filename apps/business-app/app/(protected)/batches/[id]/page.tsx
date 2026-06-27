/**
 * Batch detail page — Server Component.
 *
 * Fetches the batch with computed totals and its items from the API.
 * Shows 404 if the batch is not found.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ProductionBatchWithTotals, BatchItem } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { BatchDetail } from "@/components/batches/batch-detail";

export const dynamic = "force-dynamic";

interface BatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: BatchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const batch = await findBatch(id);
  return {
    title: batch ? `${batch.name} — PrintsbyTee Business` : "Batch not found",
  };
}

async function findBatch(
  id: string
): Promise<ProductionBatchWithTotals | null> {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  const cookie = sessionValue ? `printsbytee_session=${sessionValue}` : undefined;

  const result = await getJson<ProductionBatchWithTotals>(`/batches/${id}`, cookie);
  if (!result.ok || result.status === 404) return null;
  if (!result.ok) return null;
  return result.data;
}

async function findBatchItems(
  id: string
): Promise<BatchItem[]> {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  const cookie = sessionValue ? `printsbytee_session=${sessionValue}` : undefined;

  const result = await getJson<BatchItem[]>(`/batches/${id}/items`, cookie);
  if (!result.ok || result.status === 404) return [];
  if (!result.ok) return [];
  return result.data;
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { id } = await params;
  const [batch, items] = await Promise.all([findBatch(id), findBatchItems(id)]);

  if (!batch) notFound();

  return <BatchDetail batch={batch} items={items} />;
}
