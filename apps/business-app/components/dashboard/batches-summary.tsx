/**
 * Batches Summary — displays a list of recent production batches.
 */

import Link from "next/link";
import type { ProductionBatch } from "@printsbytee/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightIcon, PackageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchesSummaryProps {
  batches: ProductionBatch[];
  isLoading?: boolean;
}

function formatCost(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function totalBatchCost(batch: ProductionBatch): number {
  const { productionCost, marketingCost } = batch;
  return (
    productionCost.materials +
    productionCost.logistics +
    productionCost.salary +
    productionCost.other +
    marketingCost
  );
}

export function BatchesSummary({ batches, isLoading }: BatchesSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Batches</CardTitle>
        <Link href="/batches">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRightIcon />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PackageIcon className="size-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No batches yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first batch to start tracking production.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.slice(0, 5).map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{batch.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Created {formatDate(batch.createdAt)}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-medium">
                    {formatCost(totalBatchCost(batch))}
                  </p>
                  <p className="text-xs text-muted-foreground">total cost</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
