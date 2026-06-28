"use client";

/**
 * Batch form — create or edit.
 *
 * Uses react-hook-form with zod resolver against the shared schemas.
 * - Create: CreateBatchRequestSchema
 * - Edit: UpdateBatchRequestSchema
 *
 * Submit handlers POST/PATCH to the Route Handlers (not directly to the API),
 * which proxy with the session cookie.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateBatchRequestSchema,
  UpdateBatchRequestSchema,
  type CreateBatchRequest,
  type UpdateBatchRequest,
} from "@printsbytee/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatchFormFields } from "./batch-form-fields";
import { BatchFormActions } from "./batch-form-actions";

type Props =
  | { mode: "create"; initialValues?: undefined; id?: undefined }
  | { mode: "edit"; initialValues: Partial<UpdateBatchRequest>; id: string };

const defaultProductionCost = {
  materials: 0,
  logistics: 0,
  salary: 0,
  other: 0,
};

const defaultCreateValues: CreateBatchRequest = {
  name: "",
  productionCost: defaultProductionCost,
  marketingCost: 0,
};

const defaultEditValues: UpdateBatchRequest = {
  name: "",
  productionCost: defaultProductionCost,
  marketingCost: 0,
};

export function BatchForm({ mode, initialValues, id }: Props) {
  const router = useRouter();

  const form = useForm<CreateBatchRequest | UpdateBatchRequest>({
    resolver: zodResolver(
      mode === "create" ? CreateBatchRequestSchema : UpdateBatchRequestSchema
    ),
    defaultValues:
      mode === "create"
        ? defaultCreateValues
        : {
            ...defaultEditValues,
            ...initialValues,
            productionCost: {
              ...defaultProductionCost,
              ...(initialValues?.productionCost ?? {}),
            },
          },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit(values: CreateBatchRequest | UpdateBatchRequest) {
    setSubmitError(null);

    const url =
      mode === "create" ? "/api/batches" : `/api/batches/${id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login?reason=expired");
        return;
      }
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      setSubmitError(errorBody.error?.message ?? "Failed to save batch");
      return;
    }

    router.push("/batches");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New batch" : "Edit batch"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <BatchFormFields form={form} />

          {submitError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <BatchFormActions
            mode={mode}
            isSubmitting={form.formState.isSubmitting}
          />
        </form>
      </CardContent>
    </Card>
  );
}
