"use client";

/**
 * SignOutButton — client component.
 *
 * POSTs to /api/auth/logout, then navigates to /login. The Route Handler
 * clears the cookie server-side and forwards the clearing Set-Cookie, so
 * the browser removes the cookie from the business-app origin too.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  /** Optional label override. Defaults to "Sign out". */
  label?: string;
}

export function SignOutButton({ label = "Sign out" }: SignOutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={pending}>
      {pending ? "Signing out…" : label}
    </Button>
  );
}