/**
 * Batch detail — displays batch info, computed totals, and item list.
 *
 * Shows cost breakdown, revenue figures, profit/loss, and item table.
 */

import type { ProductionBatchWithTotals, BatchItem } from "@printsbytee/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { BatchItemsTable } from "./batch-items-table";

interface BatchDetailProps {
  batch: ProductionBatchWithTotals;
  items: BatchItem[];
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BatchDetail({ batch, items }: BatchDetailProps) {
  const { productionCost, marketingCost } = batch;
  const totalCost =
    productionCost.materials +
    productionCost.logistics +
    productionCost.salary +
    productionCost.other +
    marketingCost;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/batches" aria-label="Back to batches">
            <Button variant="outline" size="icon" aria-label="Back to batches">
              <ArrowLeftIcon />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold">{batch.name}</h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(batch.createdAt)}
            </p>
          </div>
        </div>
        <Link href={`/batches/${batch.id}/edit`}>
          <Button variant="outline" size="sm">
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit batch
          </Button>
        </Link>
      </div>

      {/* Totals summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Expected vs Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expected revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(batch.totals.expectedRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Sum of planned prices across {batch.totals.itemCount} sellable/sold items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actual revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(batch.totals.actualRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">From recorded sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(totalCost)}</p>
            <p className="text-xs text-muted-foreground">Production + marketing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {batch.totals.profitSoFar >= 0 ? "Profit so far" : "Loss so far"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                batch.totals.profitSoFar >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPrice(Math.abs(batch.totals.profitSoFar))}
            </p>
            <p className="text-xs text-muted-foreground">
              {batch.totals.profitSoFar >= 0 ? "Profit" : "Loss"} vs expected{" "}
              {formatPrice(Math.abs(batch.totals.expectedProfit))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">Materials</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatPrice(productionCost.materials)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">Logistics</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatPrice(productionCost.logistics)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">Salary</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatPrice(productionCost.salary)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">Other</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatPrice(productionCost.other)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">Marketing</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatPrice(marketingCost)}
              </dd>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <dt className="text-sm font-medium text-muted-foreground">Total</dt>
              <dd className="mt-1 text-lg font-bold">{formatPrice(totalCost)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Items list */}
      <Card>
        <CardHeader>
          <CardTitle>Batch items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchItemsTable items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
