/**
 * Batch list — displays all batches as cards.
 *
 * Shows batch name, creation date, item count, and cost summary.
 * Each card links to the batch detail page.
 */

import Link from "next/link";
import type { ProductionBatchWithTotals } from "@printsbytee/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";

interface BatchListProps {
  batches: ProductionBatchWithTotals[];
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function totalCost(batch: ProductionBatchWithTotals): number {
  const { productionCost, marketingCost } = batch;
  return (
    productionCost.materials +
    productionCost.logistics +
    productionCost.salary +
    productionCost.other +
    marketingCost
  );
}

export function BatchList({ batches }: BatchListProps) {
  if (batches.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No batches yet. Create your first batch to get started.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {batches.map((batch) => (
        <Card key={batch.id} className="flex flex-col">
          <CardContent className="flex-1 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading text-base font-medium leading-tight">
                  {batch.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {formatDate(batch.createdAt)}
                </p>
              </div>
              <Badge variant="outline">{batch.totals.itemCount} items</Badge>
            </div>

            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total cost</dt>
                <dd className="font-medium">{formatPrice(totalCost(batch))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expected revenue</dt>
                <dd className="font-medium">
                  {formatPrice(batch.totals.expectedRevenue)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Actual revenue</dt>
                <dd className="font-medium">
                  {formatPrice(batch.totals.actualRevenue)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expected profit</dt>
                <dd
                  className={`font-medium ${
                    batch.totals.expectedProfit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPrice(Math.abs(batch.totals.expectedProfit))}
                  {batch.totals.expectedProfit < 0 ? " loss" : " profit"}
                </dd>
              </div>
            </dl>
          </CardContent>

          <CardFooter className="border-t pt-3">
            <Link href={`/batches/${batch.id}`} className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                View details
                <ArrowRightIcon />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
