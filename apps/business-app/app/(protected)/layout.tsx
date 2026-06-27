/**
 * Protected layout — server component.
 *
 * Auth gate for all routes under `(protected)/`. On every request:
 * 1. Reads the session cookie via `readSessionCookie()`.
 * 2. Calls `GET /auth/me` with that cookie forwarded.
 * 3. On 401 (missing / invalid / expired session) → `redirect('/login')`.
 * 4. On 200 → renders the top bar (user email + sign-out) and children.
 *
 * Uses `dynamic = force-dynamic` so every request re-validates the session
 * rather than caching a stale user object.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { cookies } from "next/headers";
import type { AuthMeResponse } from "@printsbytee/shared";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PackageIcon, BoxesIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PrintsbyTee Business",
};

/**
 * Fetches the authenticated user from the API.
 * Returns `null` if the session cookie is absent or the API returns 401.
 */
async function requireAuthUser(): Promise<AuthMeResponse | null> {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  if (!sessionValue) return null;

  const result = await getJson<AuthMeResponse>(
    "/auth/me",
    `printsbytee_session=${sessionValue}`
  );

  if (!result.ok || result.status === 401) return null;
  return result.data;
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <nav className="flex items-center gap-1">
          <Link
            href="/products"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PackageIcon className="size-4" />
            Products
          </Link>
          <Link
            href="/batches"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <BoxesIcon className="size-4" />
            Batches
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      {/* Page content */}
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        {children}
      </main>
    </div>
  );
}