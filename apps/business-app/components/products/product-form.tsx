"use client";

/**
 * Product form — create or edit.
 *
 * Uses react-hook-form with zod resolver against the shared schemas.
 * - Create: CreateProductRequestSchema
 * - Edit: UpdateProductRequestSchema (slug excluded by schema)
 *
 * Submit handlers POST/PATCH to the Route Handlers (not directly to the API),
 * which proxy with the session cookie.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateProductRequestSchema,
  UpdateProductRequestSchema,
  type CreateProductRequest,
  type UpdateProductRequest,
} from "@printsbytee/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormFields } from "./product-form-fields";

type Props =
  | { mode: "create"; initialValues?: undefined; id?: undefined }
  | { mode: "edit"; initialValues: Partial<UpdateProductRequest>; id: string };

export function ProductForm({ mode, initialValues, id }: Props) {
  const router = useRouter();

  const form = useForm<CreateProductRequest | UpdateProductRequest>({
    resolver: zodResolver(
      mode === "create" ? CreateProductRequestSchema : UpdateProductRequestSchema
    ),
    defaultValues: initialValues ?? (mode === "create"
      ? {
          name: "",
          category: undefined,
          slug: "",
          description: "",
          price: 0,
          sizes: [],
          images: [],
          notifyMeEnabled: false,
          featured: false,
        }
      : {
          name: "",
          description: "",
          price: 0,
          sizes: [],
          images: [],
          notifyMeEnabled: false,
          featured: false,
        }),
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit(values: CreateProductRequest | UpdateProductRequest) {
    setSubmitError(null);

    const url = mode === "create" ? "/api/products" : `/api/products/${id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      setSubmitError(errorBody.error?.message ?? "Failed to save product");
      return;
    }

    router.push("/products");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New product" : "Edit product"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ProductFormFields form={form} mode={mode} />

          {submitError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Saving…"
                : mode === "create"
                ? "Create product"
                : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}