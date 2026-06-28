"use client";

/**
 * Route-level error boundary for everything under `(protected)`.
 *
 * Surfaces API/data-load failures with a clear message + retry, instead
 * of rendering a misleading empty state (e.g. "No batches yet" when the
 * API actually returned 500).
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console; production logging would hook here.
    console.error("[business-app] route error:", error);
  }, [error]);

  return (
    <div className="w-full space-y-4 rounded-3xl border border-destructive/40 bg-card p-8 text-center">
      <h1 className="font-heading text-2xl font-bold text-destructive">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      ) : null}
      <div className="flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}