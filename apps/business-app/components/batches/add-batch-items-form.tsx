"use client";

/**
 * Add batch items form — bulk create items in a batch.
 *
 * Lets the owner pick a product and quantity, then submit.
 * Server defaults plannedSalePrice to the product's price if omitted.
 * Uses react-hook-form with manual validation.
 */

import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import type { Product } from "@printsbytee/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface AddBatchItemsFormProps {
  batchId: string;
  products: Product[];
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface FormValues {
  productId: string;
  quantity: string;
  plannedSalePrice: string;
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getString(form: UseFormReturn<FormValues>, field: "productId" | "quantity" | "plannedSalePrice"): string {
  const value = form.watch(field);
  return value ?? "";
}

export function AddBatchItemsForm({
  batchId,
  products,
  onSuccess,
  onError,
}: AddBatchItemsFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");

  const form = useForm<FormValues>({
    defaultValues: {
      productId: "",
      quantity: "1",
      plannedSalePrice: "",
    },
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const productPrice = selectedProduct?.price;
  const quantityStr = getString(form, "quantity");
  const quantity = parseInt(quantityStr || "0", 10);
  const productId = getString(form, "productId");
  const isValid = isValidUuid(productId) && quantity >= 1 && quantity <= 999;

  async function onSubmit() {
    const values = form.getValues();
    const qty = parseInt(values.quantity || "0", 10);
    const psp = values.plannedSalePrice ? parseInt(values.plannedSalePrice, 10) : undefined;

    if (!isValidUuid(values.productId) || qty < 1 || qty > 999) {
      onError("Please fill in all required fields correctly");
      return;
    }

    setSubmitting(true);

    // Expand quantity into individual item entries
    const items = Array.from({ length: qty }, () => ({
      productId: values.productId,
      plannedSalePrice: psp,
    }));

    const response = await fetch(`/api/batches/${batchId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (response.ok) {
      onSuccess();
      return;
    }

    if (response.status === 401) {
      window.location.href = "/login?reason=expired";
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    onError(body.error?.message ?? "Failed to add items");
    setSubmitting(false);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      {/* Product select */}
      <div className="space-y-1.5">
        <Label htmlFor="productId">Product *</Label>
        <Select
          value={productId || ""}
          onValueChange={(val) => {
            if (!val) return;
            form.setValue("productId", val, { shouldValidate: true });
            setSelectedProductId(val);
          }}
        >
          <SelectTrigger id="productId">
            <SelectValue placeholder="Select a product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} — {formatPrice(product.price)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-1.5">
        <Label htmlFor="quantity">Quantity *</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={999}
          {...form.register("quantity")}
        />
        {productPrice !== undefined && (
          <p className="text-xs text-muted-foreground">
            Default price: {formatPrice(productPrice)} per item
          </p>
        )}
      </div>

      {/* Planned sale price override */}
      <div className="space-y-1.5">
        <Label htmlFor="plannedSalePrice">
          Planned price override (pence)
        </Label>
        <Input
          id="plannedSalePrice"
          type="number"
          min={0}
          placeholder={productPrice !== undefined ? String(productPrice) : ""}
          {...form.register("plannedSalePrice")}
        />
        <p className="text-xs text-muted-foreground">
          Enter price in pence (e.g. 4000 for £40.00). Leave blank to use the
          product&apos;s default price.
        </p>
      </div>

      <Button
        type="submit"
        disabled={submitting || !isValid}
        className="w-full"
      >
        <PlusIcon />
        {submitting ? "Adding items…" : `Add ${quantity || 0} item${quantity !== 1 ? "s" : ""}`}
      </Button>
    </form>
  );
}
