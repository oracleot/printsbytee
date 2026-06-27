import type { HealthResponse } from "@printsbytee/shared";

const fallbackApiBaseUrl = "http://localhost:3000";
const sharedContractName = "HealthResponse";

export const dynamic = "force-dynamic";

function getApiBaseUrl() {
  return (process.env.API_BASE_URL ?? fallbackApiBaseUrl).replace(/\/$/, "");
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return typeof value === "object" && value !== null && "status" in value && value.status === "ok";
}

async function getHealthStatus(): Promise<{
  apiBaseUrl: string;
  health?: HealthResponse;
  error?: string;
}> {
  const apiBaseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/health`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}.`);
    }

    const data: unknown = await response.json();
    if (!isHealthResponse(data)) {
      throw new Error("Health check returned an unexpected response shape.");
    }

    return { apiBaseUrl, health: data };
  } catch (error) {
    return {
      apiBaseUrl,
      error: error instanceof Error ? error.message : "Unknown error while calling /health.",
    };
  }
}

export default async function HomePage() {
  const { apiBaseUrl, health, error } = await getHealthStatus();

  return (
    <section className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">I26 scaffold</p>
        <h1 className="text-4xl font-heading text-balance">business-app scaffold ready</h1>
        <p className="max-w-2xl text-muted-foreground">
          Next.js, Tailwind v4, and shadcn are wired. Shared contract import verified with
          <span className="ml-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            {sharedContractName}
          </span>
        </p>
      </div>

      <dl className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <dt className="text-sm font-medium text-muted-foreground">API base URL</dt>
          <dd className="mt-2 break-all text-sm">{apiBaseUrl}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <dt className="text-sm font-medium text-muted-foreground">/health response</dt>
          <dd className="mt-2 text-sm">{health ? JSON.stringify(health) : error ?? "Not available"}</dd>
        </div>
      </dl>
    </section>
  );
}
