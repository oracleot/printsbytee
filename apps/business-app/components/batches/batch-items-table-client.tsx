"use client";

/**
 * Batch items table (client) — displays items in a batch with status badges and sale actions.
 *
 * Fetches sale data for sold items and shows Record Sale / Undo Sale buttons.
 */

import { useEffect, useState } from "react";
import type { BatchItem, Sale } from "@printsbytee/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RecordSaleDialog } from "./record-sale-dialog";
import { UndoSaleButton } from "./undo-sale-button";
import { SaleDetails } from "./sale-details";

interface BatchItemsTableClientProps {
  items: BatchItem[];
  soldItemIds: string[];
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: BatchItem["status"] }) {
  const variants: Record<BatchItem["status"], "success" | "destructive" | "secondary"> = {
    sellable: "secondary",
    sold: "success",
    faulty: "destructive",
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "…";
}

export function BatchItemsTableClient({ items, soldItemIds }: BatchItemsTableClientProps) {
  const [sales, setSales] = useState<Map<string, Sale>>(new Map());
  const soldItemIdsKey = soldItemIds.join(",");

  useEffect(() => {
    if (soldItemIdsKey === "") return;

    Promise.allSettled(
      soldItemIdsKey.split(",").map(async (itemId) => {
        const res = await fetch(`/api/sales/by-batch-item/${itemId}`);
        if (!res.ok) return null;
        const sale = (await res.json()) as Sale;
        return { itemId, sale };
      })
    ).then((results) => {
      const newSales = new Map<string, Sale>();
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          newSales.set(result.value.itemId, result.value.sale);
        }
      }
      setSales(newSales);
    });
  }, [soldItemIdsKey]);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No items in this batch yet.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Planned price</TableHead>
            <TableHead>Sale details</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const sale = sales.get(item.id);
            return (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {truncateId(item.id)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(item.plannedSalePrice)}
                </TableCell>
                <TableCell>
                  {item.status === "sold" ? (
                    sale ? (
                      <SaleDetails sale={sale} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  {item.status === "sellable" && (
                    <RecordSaleDialog item={item} />
                  )}
                  {item.status === "sold" && sale && (
                    <UndoSaleButton saleId={sale.id} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}