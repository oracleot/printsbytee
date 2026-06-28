"use client";

/**
 * Individual form fields for the batch form.
 * Used by BatchForm — does not manage form state itself.
 */

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { CreateBatchRequest, UpdateBatchRequest } from "@printsbytee/shared";

type FormValues = CreateBatchRequest | UpdateBatchRequest;

interface BatchFormFieldsProps {
  form: UseFormReturn<FormValues>;
}

function CostField({
  label,
  id,
  value,
  onChange,
  error,
  description,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (val: number) => void;
  error?: string;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
          £
        </span>
        <Input
          id={id}
          type="number"
          min={0}
          value={value || ""}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onChange(isNaN(parsed) ? 0 : parsed);
          }}
          className="pl-7"
          aria-invalid={!!error}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function BatchFormFields({ form }: BatchFormFieldsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors: rawErrors },
  } = form;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = rawErrors as any;

  const watchProductionCost = watch("productionCost") ?? {
    materials: 0,
    logistics: 0,
    salary: 0,
    other: 0,
  };
  const watchMarketingCost = watch("marketingCost") ?? 0;

  function setCostField(field: "materials" | "logistics" | "salary" | "other", value: number) {
    setValue(
      "productionCost",
      { ...watchProductionCost, [field]: value },
      { shouldValidate: true }
    );
  }

  function setMarketingCost(value: number) {
    setValue("marketingCost", value, { shouldValidate: true });
  }

  const totalProductionCost =
    watchProductionCost.materials +
    watchProductionCost.logistics +
    watchProductionCost.salary +
    watchProductionCost.other;

  const totalCost = totalProductionCost + watchMarketingCost;

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Batch name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g. Summer 2024 Collection"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          A descriptive name to identify this production batch.
        </p>
      </div>

      {/* Production Cost Breakdown */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Production cost breakdown</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <CostField
            label="Materials"
            id="materials"
            value={watchProductionCost.materials}
            onChange={(val) => setCostField("materials", val)}
            error={errors.productionCost?.materials?.message}
            description="Fabric, ink, packaging materials"
          />

          <CostField
            label="Logistics"
            id="logistics"
            value={watchProductionCost.logistics}
            onChange={(val) => setCostField("logistics", val)}
            error={errors.productionCost?.logistics?.message}
            description="Shipping, handling, storage"
          />

          <CostField
            label="Salary"
            id="salary"
            value={watchProductionCost.salary}
            onChange={(val) => setCostField("salary", val)}
            error={errors.productionCost?.salary?.message}
            description="Labor costs for production"
          />

          <CostField
            label="Other"
            id="other"
            value={watchProductionCost.other}
            onChange={(val) => setCostField("other", val)}
            error={errors.productionCost?.other?.message}
            description="Miscellaneous production costs"
          />
        </div>

        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total production cost</span>
            <span className="font-medium">£{(totalProductionCost / 100).toFixed(2)}</span>
          </div>
        </div>
      </fieldset>

      {/* Marketing Cost */}
      <div className="space-y-4">
        <CostField
          label="Marketing cost"
          id="marketingCost"
          value={watchMarketingCost}
          onChange={setMarketingCost}
          error={errors.marketingCost?.message}
          description="Advertising, promotions, and marketing expenses"
        />
      </div>

      {/* Total Cost Summary */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex justify-between text-base">
          <span className="font-medium">Total batch cost</span>
          <span className="font-bold">£{(totalCost / 100).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
