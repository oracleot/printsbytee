/**
 * Batch item status badge — small pill showing item status.
 */

import type { BatchItem } from "@printsbytee/shared";
import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<BatchItem["status"], "success" | "destructive" | "secondary"> = {
  sellable: "secondary",
  sold: "success",
  faulty: "destructive",
};

export function BatchItemStatusBadge({ status }: { status: BatchItem["status"] }) {
  return (
    <Badge variant={VARIANTS[status]} className="capitalize">
      {status}
    </Badge>
  );
}
