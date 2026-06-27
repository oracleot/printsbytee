/**
 * Login page — server component.
 *
 * Renders a centred card with the <LoginForm /> client component.
 * No auth check here — this route is intentionally public.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
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