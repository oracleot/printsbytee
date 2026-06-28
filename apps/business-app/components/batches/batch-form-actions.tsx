"use client";

/**
 * Action buttons for the batch form.
 * Extracted to keep batch-form.tsx under 200 lines.
 */

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface BatchFormActionsProps {
  mode: "create" | "edit";
  isSubmitting: boolean;
}

export function BatchFormActions({ mode, isSubmitting }: BatchFormActionsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => router.back()}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Saving…"
          : mode === "create"
          ? "Create batch"
          : "Save changes"}
      </Button>
    </div>
  );
}
