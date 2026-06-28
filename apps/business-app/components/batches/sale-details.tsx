"use client";

/**
 * Sale details — read-only summary of a sold item's sale.
 *
 * Shows sale price, date, and optional customer name/contact.
 */

import type { Sale } from "@printsbytee/shared";

interface SaleDetailsProps {
  sale: Sale;
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

export function SaleDetails({ sale }: SaleDetailsProps) {
  return (
    <div className="space-y-0.5 text-xs">
      <p>
        <span className="font-medium">{formatPrice(sale.salePrice)}</span>
        <span className="ml-1 text-muted-foreground">{formatDate(sale.soldAt)}</span>
      </p>
      {sale.customerName && (
        <p className="font-medium">{sale.customerName}</p>
      )}
      {sale.customerContact && (
        <p className="text-muted-foreground">{sale.customerContact}</p>
      )}
    </div>
  );
}