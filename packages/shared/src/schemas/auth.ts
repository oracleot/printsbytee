import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './common.js';

export const UserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  createdAt: isoTimestampSchema,
});

export const SessionSchema = z.object({
  id: z.string().min(1),
  userId: uuidSchema,
  expiresAt: isoTimestampSchema,
  createdAt: isoTimestampSchema,
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthMeResponseSchema = UserSchema;

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
