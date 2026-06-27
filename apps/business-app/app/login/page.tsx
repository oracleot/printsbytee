/**
 * Login page — server component.
 *
 * Renders a centred card with the <LoginForm /> client component.
 * No auth check here — this route is intentionally public.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = await searchParams;
  const expired = reason === "expired";

  return (
    <Card className="w-full max-w-sm">
      {expired && (
        <div className="mx-4 mt-4 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300">
          Your session has expired. Please sign in again.
        </div>
      )}
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Sign in</CardTitle>
        <CardDescription>Access the PrintsbyTee business app</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}