/**
 * New batch page — Server Component shell wrapping BatchForm.
 */

import type { Metadata } from "next";
import { BatchForm } from "@/components/batches/batch-form";

export const metadata: Metadata = {
  title: "New batch — PrintsbyTee Business",
};

export default function NewBatchPage() {
  return (
    <div className="w-full max-w-2xl">
      <h1 className="mb-6 font-heading text-3xl font-bold">New batch</h1>
      <BatchForm mode="create" />
    </div>
  );
}
