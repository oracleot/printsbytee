"use client";

/**
 * Boolean toggle fields for the product form.
 * Extracted from product-form-fields.tsx to keep that file under 200 lines.
 */

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import type { CreateProductRequest, UpdateProductRequest } from "@printsbytee/shared";

type FormValues = CreateProductRequest | UpdateProductRequest;

interface ProductFormTogglesProps {
  form: UseFormReturn<FormValues>;
}

export function ProductFormToggles({ form }: ProductFormTogglesProps) {
  const { register } = form;
  return (
    <>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="notifyMeEnabled"
          className="accent-primary size-4"
          {...register("notifyMeEnabled")}
        />
        <Label htmlFor="notifyMeEnabled" className="font-normal">
          Enable &quot;Notify me&quot; when out of stock
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="featured"
          className="accent-primary size-4"
          {...register("featured")}
        />
        <Label htmlFor="featured" className="font-normal">
          Featured product
        </Label>
      </div>
    </>
  );
}