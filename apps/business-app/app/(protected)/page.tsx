/**
 * Protected home page — server component.
 *
 * This page is only reached when the `(protected)/layout.tsx` auth gate
 * has verified a valid session. It shows:
 * - A welcome message confirming the owner is authenticated
 * - The API health-check card (preserved from the I26 scaffold)
 *
 * The sign-out button lives in the protected layout's top bar.
 */

import type { HealthResponse } from "@printsbytee/shared";
import { apiBaseUrl } from "@/lib/api-server";

export const dynamic = "force-dynamic";

function isHealthResponse(value: unknown): value is HealthResponse {
  return typeof value === "object" && value !== null && "status" in value && value.status === "ok";
}

async function getHealthStatus(): Promise<{
  apiBaseUrl: string;
  health?: HealthResponse;
  error?: string;
}> {
  const baseUrl = apiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/health`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}.`);
    }

    const data: unknown = await response.json();
    if (!isHealthResponse(data)) {
      throw new Error("Health check returned an unexpected response shape.");
    }

    return { apiBaseUrl: baseUrl, health: data };
  } catch (err) {
    return {
      apiBaseUrl: baseUrl,
      error: err instanceof Error ? err.message : "Unknown error while calling /health.",
    };
  }
}

export default async function HomePage() {
  const { apiBaseUrl, health, error } = await getHealthStatus();

  return (
    <section className="w-full max-w-3xl space-y-8">
      {/* Welcome card */}
      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">I27 auth</p>
        <h1 className="mt-3 text-4xl font-heading text-balance">Welcome to the business app</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          You are signed in. Use the top bar to sign out, or check the API health below.
        </p>
      </div>

      {/* Health check card */}
      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">API health</p>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-4">
            <dt className="text-sm font-medium text-muted-foreground">API base URL</dt>
            <dd className="mt-2 break-all text-sm">{apiBaseUrl}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <dt className="text-sm font-medium text-muted-foreground">/health response</dt>
            <dd className="mt-2 text-sm">
              {health ? JSON.stringify(health) : error ?? "Not available"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}