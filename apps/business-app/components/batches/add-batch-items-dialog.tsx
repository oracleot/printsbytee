"use client";

/**
 * Add batch items dialog — triggers a bulk-add modal.
 *
 * Wraps AddBatchItemsForm with Dialog, Button trigger, and success/error
 * handling. Calls router.refresh() on success.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@printsbytee/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { AddBatchItemsForm } from "./add-batch-items-form";

interface AddBatchItemsDialogProps {
  batchId: string;
  products: Product[];
}

export function AddBatchItemsDialog({
  batchId,
  products,
}: AddBatchItemsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSuccess() {
    setOpen(false);
    setError(null);
    router.refresh();
  }

  function handleError(message: string) {
    setError(message);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><PlusIcon />Add items</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add batch items</DialogTitle>
          <DialogDescription>
            Select a product and quantity. The planned price defaults to the
            product&apos;s selling price but can be overridden.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <AddBatchItemsForm
          batchId={batchId}
          products={products}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </DialogContent>
    </Dialog>
  );
}
