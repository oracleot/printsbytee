import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './common.js';

/**
 * Public owner-account shape. Returned by `POST /auth/login` (200) and
 * `GET /auth/me` (200). Never includes `passwordHash` — that field is
 * internal to the API and must not appear on the wire.
 */
export const UserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  createdAt: isoTimestampSchema,
});

/**
 * Server-side session row shape. Returned by admin/diagnostic endpoints
 * only — never by `/auth/login`, `/auth/logout`, or `/auth/me`. The
 * session ID is the cookie value, so leaking it in a response body
 * would be equivalent to leaking the cookie itself.
 */
export const SessionSchema = z.object({
  id: z.string().min(1),
  userId: uuidSchema,
  expiresAt: isoTimestampSchema,
  createdAt: isoTimestampSchema,
});

/**
 * Body of `POST /auth/login`. The password is intentionally bounded
 * only by `.min(1)` — any non-empty string is accepted at the wire
 * layer. Comparison against the stored bcrypt hash is the source of
 * truth for "is this a valid password".
 */
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Response shape for `POST /auth/login` and `GET /auth/me`.
 *
 * Aliasing `UserSchema` keeps the wire shape of both endpoints
 * identical so the business app only has to type one response. If
 * either endpoint later returns extra fields (e.g. roles), give it a
 * dedicated schema here rather than overloading `UserSchema`.
 */
export const LoginResponseSchema = UserSchema;
export const AuthMeResponseSchema = UserSchema;

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
