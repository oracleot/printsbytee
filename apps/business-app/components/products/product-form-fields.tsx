"use client";

/**
 * Individual form fields for the product form.
 * Used by ProductForm — does not manage form state itself.
 */

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProductCategorySchema,
  type ProductCategory,
  type CreateProductRequest,
  type UpdateProductRequest,
} from "@printsbytee/shared";
import { ImageUrlList } from "./image-url-list";
import { ProductFormToggles } from "./product-form-toggles";

type FormValues = CreateProductRequest | UpdateProductRequest;

const CATEGORIES = ProductCategorySchema.options as [string, ...string[]];

interface ProductFormFieldsProps {
  form: UseFormReturn<FormValues>;
  mode: "create" | "edit";
}

export function ProductFormFields({ form, mode }: ProductFormFieldsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors: rawErrors },
  } = form;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = rawErrors as any;

  const watchImages = watch("images") ?? ([] as string[]);
  const watchSizes = watch("sizes") ?? ([] as string[]);

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={watch("category") ?? ""}
          onValueChange={(val) => setValue("category", val as ProductCategory, { shouldValidate: true })}
        >
          <SelectTrigger id="category" aria-invalid={!!errors.category}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat: string) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* Slug (create only) */}
      {mode === "create" && (
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            {...register("slug")}
            placeholder="e.g. my-product-name"
            aria-invalid={!!errors.slug?.message}
          />
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only. Immutable after creation.
          </p>
        </div>
      )}

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={4}
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <Label htmlFor="price">Price (pence) *</Label>
        <Input
          id="price"
          type="number"
          min={0}
          {...register("price", { valueAsNumber: true })}
          aria-invalid={!!errors.price}
        />
        {errors.price && (
          <p className="text-xs text-destructive">{errors.price.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Enter price in pence (e.g. 4000 for £40.00)
        </p>
      </div>

      {/* Sizes */}
      <div className="space-y-1.5">
        <Label htmlFor="sizes">Sizes</Label>
        <Input
          id="sizes"
          value={watchSizes.join(", ")}
          onChange={(e) => {
            const raw = e.target.value;
            const sizes = raw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            setValue("sizes", sizes, { shouldValidate: true });
          }}
          placeholder="e.g. S, M, L, XL"
          aria-invalid={!!errors.sizes}
        />
        {errors.sizes && (
          <p className="text-xs text-destructive">{errors.sizes.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Comma-separated. E.g. S, M, L, XL
        </p>
      </div>

      {/* Images */}
      <div className="space-y-1.5">
        <Label>Images</Label>
        {/* // TODO(I22): Replace plain URL text inputs with a file-upload widget */}
        {/* backed by POST /uploads once I22 is implemented. */}
        <ImageUrlList
          value={watchImages}
          onChange={(urls) => setValue("images", urls, { shouldValidate: true })}
          error={errors.images?.message}
        />
        <p className="text-xs text-muted-foreground">
          Enter the full URL for each product image.
        </p>
      </div>

      {/* NotifyMeEnabled & Featured toggles */}
      <ProductFormToggles form={form} />
    </div>
  );
}