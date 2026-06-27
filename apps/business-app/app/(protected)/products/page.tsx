/**
 * Product list page — Server Component.
 *
 * Reads all products (public endpoint) and renders the grid.
 * The auth gate in (protected)/layout.tsx ensures a valid session.
 */

import { cookies } from "next/headers";
import Link from "next/link";
import type { ProductWithStock } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { ProductList } from "@/components/products/product-list";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Products — PrintsbyTee Business",
};

export default async function ProductsPage() {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  const cookie = sessionValue ? `printsbytee_session=${sessionValue}` : undefined;

  const result = await getJson<ProductWithStock[]>("/products", cookie);

  const products: ProductWithStock[] =
    result.ok && result.status === 200 ? result.data : [];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Products</h1>
        <Link href="/products/new">
          <Button>
            <PlusIcon />
            Create product
          </Button>
        </Link>
      </div>

      <ProductList products={products} />
    </div>
  );
}