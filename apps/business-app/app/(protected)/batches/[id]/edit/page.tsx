/**
 * Edit batch page — Server Component shell.
 *
 * Fetches the batch by id and renders BatchForm in edit mode.
 * If not found, shows notFound().
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ProductionBatch, UpdateBatchRequest } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { BatchForm } from "@/components/batches/batch-form";

export const dynamic = "force-dynamic";

interface EditBatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditBatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const batch = await findBatch(id);
  return {
    title: batch ? `Edit ${batch.name} — PrintsbyTee Business` : "Edit batch",
  };
}

async function findBatch(id: string): Promise<ProductionBatch | null> {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  const cookie = sessionValue ? `printsbytee_session=${sessionValue}` : undefined;

  const result = await getJson<ProductionBatch>(`/batches/${id}`, cookie);

  // Handle not found
  if (!result.ok && "status" in result && result.status === 404) return null;

  // Handle other failures
  if (!result.ok) {
    if ("error" in result) {
      throw new Error(`Failed to load batch: ${result.message}`);
    }
    throw new Error(`Failed to load batch (HTTP ${result.status})`);
  }

  // Handle 404 on success response
  if (result.status === 404) return null;

  return result.data;
}

export default async function EditBatchPage({ params }: EditBatchPageProps) {
  const { id } = await params;
  const batch = await findBatch(id);

  if (!batch) notFound();

  // Cast to UpdateBatchRequest for the form (omits id/createdAt/updatedAt)
  const initialValues: UpdateBatchRequest = {
    name: batch.name,
    productionCost: batch.productionCost,
    marketingCost: batch.marketingCost,
  };

  return (
    <div className="w-full max-w-2xl">
      <h1 className="mb-6 font-heading text-3xl font-bold">
        Edit batch: {batch.name}
      </h1>
      <BatchForm
        mode="edit"
        initialValues={initialValues}
        id={id}
      />
    </div>
  );
}
