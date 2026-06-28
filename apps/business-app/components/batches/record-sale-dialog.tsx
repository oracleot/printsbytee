"use client";

/**
 * Record sale dialog — opens a modal with the sale form.
 *
 * Wraps SaleForm in a Dialog. Trigger is passed as children.
 */

import { useState } from "react";
import type { BatchItem } from "@printsbytee/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSignIcon } from "lucide-react";
import { SaleForm } from "./sale-form";

interface RecordSaleDialogProps {
  item: BatchItem;
  trigger?: React.ReactNode;
}

export function RecordSaleDialog({ item, trigger }: RecordSaleDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) ?? (
            <Button variant="outline" size="xs">
              <DollarSignIcon className="mr-1 h-3 w-3" />
              Record sale
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record sale</DialogTitle>
          <DialogDescription>
            Record the sale price and details for this batch item.
          </DialogDescription>
        </DialogHeader>
        <SaleForm
          item={item}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}