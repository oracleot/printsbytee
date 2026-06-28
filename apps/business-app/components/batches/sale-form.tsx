"use client";

/**
 * Sale form — record a sale for a batch item.
 *
 * Uses react-hook-form with zodResolver against RecordSaleRequestSchema.
 * Pre-fills salePrice with the item's plannedSalePrice (editable).
 * soldAt defaults to now (editable).
 * customerName and customerContact are optional.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RecordSaleRequestSchema, type RecordSaleRequest, type BatchItem } from "@printsbytee/shared";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SaleFormProps {
  item: BatchItem;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Convert an ISO UTC timestamp string to the `datetime-local` input format
 * (`YYYY-MM-DDTHH:mm`) in the browser's local timezone.
 */
function isoToLocalDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

/**
 * Convert a `datetime-local` input value (`YYYY-MM-DDTHH:mm` in local time)
 * back to an ISO UTC string for submission to the API.
 */
function localDatetimeLocalToIso(local: string): string {
  return new Date(local).toISOString();
}

export function SaleForm({ item, onSuccess, onCancel }: SaleFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RecordSaleRequest>({
    resolver: zodResolver(RecordSaleRequestSchema),
    defaultValues: {
      salePrice: item.plannedSalePrice,
      soldAt: new Date().toISOString(),
      customerName: undefined,
      customerContact: undefined,
    },
  });

  async function onSubmit(values: RecordSaleRequest) {
    setSubmitError(null);

    const response = await fetch(`/api/batch-items/${item.id}/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      router.refresh();
      onSuccess();
      return;
    }

    if (response.status === 401) {
      router.push("/login?reason=expired");
      return;
    }

    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    setSubmitError(errorBody.error?.message ?? "Failed to record sale");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Read-only product info */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Item ID</p>
          <p className="font-mono text-sm">{item.id.slice(0, 8)}…</p>
          <p className="mt-1 text-xs text-muted-foreground">Planned price</p>
          <p className="font-medium">£{(item.plannedSalePrice / 100).toFixed(2)}</p>
        </div>

        {/* Sale price */}
        <FormField
          control={form.control}
          name="salePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale price (pence)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sold at */}
        <FormField
          control={form.control}
          name="soldAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale date & time</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={isoToLocalDatetimeLocal(String(field.value ?? ''))}
                  onChange={(e) => field.onChange(localDatetimeLocalToIso(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Customer name */}
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer name (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Jane Smith"
                  maxLength={200}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Customer contact */}
        <FormField
          control={form.control}
          name="customerContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer contact (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Email or phone number"
                  maxLength={200}
                  rows={2}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Recording…" : "Record sale"}
          </Button>
        </div>
      </form>
    </Form>
  );
}