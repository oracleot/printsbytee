"use client";

/**
 * Confirmation dialog for deleting a product.
 *
 * Shows the API's exact error message on 409 (FK guardrails: batch_items or
 * waitlist_entries). On success closes + calls router.refresh().
 */

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";

interface DeleteProductDialogProps {
  id: string;
  name: string;
  trigger?: React.ReactNode;
}

export function DeleteProductDialog({
  id,
  name,
  trigger,
}: DeleteProductDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const response = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    if (response.status === 204) {
      setOpen(false);
      router.refresh();
      return;
    }

    // 409 or other error — surface the API's message
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    setError(body.error?.message ?? "Failed to delete product");
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger ?? (
          <Button variant="ghost" size="icon-xs">
            <Trash2Icon />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{name}&quot;?</DialogTitle>
          <DialogDescription>
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}