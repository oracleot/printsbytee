/**
 * New product page — Server Component shell wrapping ProductForm.
 */

import type { Metadata } from "next";
import { ProductForm } from "@/components/products/product-form";

export const metadata: Metadata = {
  title: "New product — PrintsbyTee Business",
};

export default function NewProductPage() {
  return (
    <div className="w-full max-w-2xl">
      <h1 className="mb-6 font-heading text-3xl font-bold">New product</h1>
      <ProductForm mode="create" />
    </div>
  );
}