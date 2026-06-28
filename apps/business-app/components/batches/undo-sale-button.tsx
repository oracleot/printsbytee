"use client";

/**
 * Undo sale button — confirmation dialog + DELETE /api/sales/:id.
 *
 * Shown on sold items. Reverts item to 'sellable' and triggers router.refresh().
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RotateCcwIcon } from "lucide-react";

interface UndoSaleButtonProps {
  saleId: string;
}

export function UndoSaleButton({ saleId }: UndoSaleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUndo() {
    setUndoing(true);
    setError(null);

    const response = await fetch(`/api/sales/${saleId}`, {
      method: "DELETE",
    });

    if (response.status === 204) {
      setOpen(false);
      router.refresh();
      return;
    }

    if (response.status === 401) {
      setOpen(false);
      router.push("/login?reason=expired");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    setError(body.error?.message ?? "Failed to undo sale");
    setUndoing(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="xs" className="text-destructive">
          <RotateCcwIcon className="mr-1 h-3 w-3" />
          Undo sale
        </Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Undo this sale?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the sale record and revert the item to sellable.
            The revenue will be removed from the batch totals.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUndo}
            disabled={undoing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {undoing ? "Undoing…" : "Undo sale"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}