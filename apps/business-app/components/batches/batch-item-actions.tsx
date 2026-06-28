"use client";

/**
 * Batch item row actions — mark faulty / remove.
 *
 * Renders as icon buttons in the table actions cell.
 * - "Mark faulty" is always available for non-sold items.
 * - "Remove" is only available for sellable items (not sold).
 * Uses router.refresh() after mutation to re-fetch data.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BatchItem } from "@printsbytee/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangleIcon, Trash2Icon } from "lucide-react";

interface BatchItemActionsProps {
  item: BatchItem;
}

export function BatchItemActions({ item }: BatchItemActionsProps) {
  const router = useRouter();
  const [faultyLoading, setFaultyLoading] = useState(false);
  const [faultyError, setFaultyError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BatchItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function markFaulty() {
    setFaultyLoading(true);
    setFaultyError(null);

    const response = await fetch(`/api/batch-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "faulty" }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    if (response.status === 401) {
      router.push("/login?reason=expired");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    setFaultyError(body.error?.message ?? "Failed to mark item as faulty");
    setFaultyLoading(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);

    const response = await fetch(`/api/batch-items/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (response.status === 204) {
      setDeleteTarget(null);
      router.refresh();
      return;
    }

    if (response.status === 401) {
      setDeleteTarget(null);
      router.push("/login?reason=expired");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    setDeleteError(body.error?.message ?? "Failed to remove item");
    setDeleteLoading(false);
  }

  const canRemove = item.status === "sellable";
  const canMarkFaulty = item.status !== "sold";

  return (
    <>
      <div className="flex items-center gap-1">
        {canMarkFaulty && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={markFaulty}
            disabled={faultyLoading}
            aria-label="Mark as faulty"
            title="Mark as faulty"
          >
            <AlertTriangleIcon />
          </Button>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setDeleteTarget(item);
              setDeleteError(null);
            }}
            aria-label="Remove item"
            title="Remove item"
          >
            <Trash2Icon />
          </Button>
        )}
      </div>

      {faultyError && (
        <p className="mt-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {faultyError}
        </p>
      )}

      <Dialog
        open={deleteTarget?.id === item.id}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this item?</DialogTitle>
            <DialogDescription>
              This item will be permanently removed from the batch. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
