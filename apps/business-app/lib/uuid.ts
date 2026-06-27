/**
 * UUID validation helper for Route Handler id params.
 *
 * Mirrors the pattern in `apps/api/src/routes/products/helpers.ts::parseIdParam`.
 * Returns a parsed UUID on success, or a 400 Response on failure — callers
 * return the Response directly when `ok: false`.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

const uuidSchema = z.string().uuid();

export function parseUuid(value: unknown): { ok: true; id: string } | { ok: false; response: NextResponse } {
  const parsed = uuidSchema.safeParse(value);
  if (parsed.success) {
    return { ok: true, id: parsed.data };
  }
  return {
    ok: false,
    response: NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid product ID format" } },
      { status: 400 }
    ),
  };
}