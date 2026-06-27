/**
 * Batch items table — displays items in a batch with status badges.
 *
 * Shows item ID, status, and planned sale price.
 */

import type { BatchItem } from "@printsbytee/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BatchItemsTableProps {
  items: BatchItem[];
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

export function BatchItemsTable({ items }: BatchItemsTableProps) {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
