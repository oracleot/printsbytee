/**
 * Error boundary for the dashboard page.
 */

"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangleIcon } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="w-full space-y-8">
      {/* Page header */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-heading font-bold">Dashboard</h1>
      </div>

      {/* Error card */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangleIcon className="size-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load dashboard</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred while loading your dashboard data."}
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
