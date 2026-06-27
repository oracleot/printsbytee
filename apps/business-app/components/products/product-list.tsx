/**
 * Product list — Server Component.
 *
 * Renders a grid of product Cards: image thumbnail (first image or gradient
 * placeholder), name, category, price, featured badge, stock label badge.
 * Each card has Edit and Delete actions.
 */

import Link from "next/link";
import Image from "next/image";
import type { ProductWithStock } from "@printsbytee/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DeleteProductDialog } from "./delete-product-dialog";
import { PencilIcon } from "lucide-react";

interface ProductListProps {
  products: ProductWithStock[];
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {category}
    </span>
  );
}

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No products yet.{" "}
        <Link href="/products/new" className="text-primary underline underline-offset-2">
          Create one
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} className="flex flex-col overflow-hidden">
          {/* Thumbnail */}
          <div className="relative aspect-square w-full bg-muted">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <span className="text-4xl text-muted-foreground/40">👗</span>
              </div>
            )}
            {product.featured && (
              <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                Featured
              </span>
            )}
            {product.stockLabel === "low-stock" && (
              <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                Low stock
              </span>
            )}
          </div>

          {/* Info */}
          <CardContent className="flex-1 py-3">
            <p className="text-xs text-muted-foreground">
              <CategoryBadge category={product.category} />
            </p>
            <h3 className="mt-1 font-heading text-base font-medium leading-tight">
              {product.name}
            </h3>
            <p className="mt-1 font-semibold">{formatPrice(product.price)}</p>
            {!product.inStock && (
              <p className="mt-0.5 text-xs text-muted-foreground">Out of stock</p>
            )}
          </CardContent>

          {/* Actions */}
          <CardFooter className="gap-2 border-t pt-3">
            <Link href={`/products/${product.id}/edit`}>
              <Button variant="outline" size="sm" className="w-full">
                <PencilIcon />
                Edit
              </Button>
            </Link>
            <DeleteProductDialog
              id={product.id}
              name={product.name}
            />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}