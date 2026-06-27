/**
 * Edit product page — Server Component shell.
 *
 * Fetches the product list, finds the matching product by id,
 * and renders ProductForm in edit mode. If not found, shows notFound().
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ProductWithStock, UpdateProductRequest } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { ProductForm } from "@/components/products/product-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(id);
  return {
    title: product ? `Edit ${product.name} — PrintsbyTee Business` : "Edit product",
  };
}

async function findProduct(id: string): Promise<ProductWithStock | null> {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  const cookie = sessionValue ? `printsbytee_session=${sessionValue}` : undefined;

  const result = await getJson<ProductWithStock[]>("/products", cookie);
  if (!result.ok || result.status !== 200) return null;
  return result.data.find((p) => p.id === id) ?? null;
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await findProduct(id);

  if (!product) notFound();

  // Cast to UpdateProductRequest for the form (omits id/slug/createdAt/updatedAt)
  const initialValues: UpdateProductRequest = {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    sizes: product.sizes,
    images: product.images,
    notifyMeEnabled: product.notifyMeEnabled,
    featured: product.featured,
  };

  return (
    <div className="w-full max-w-2xl">
      <h1 className="mb-6 font-heading text-3xl font-bold">
        Edit product: {product.name}
      </h1>
      <ProductForm
        mode="edit"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialValues={initialValues as any}
        id={id}
      />
    </div>
  );
}