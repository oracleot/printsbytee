import { z } from 'zod';

/** UUID v4 string. */
export const uuidSchema = z.string().uuid();

/** ISO 8601 timestamp string. */
export const isoTimestampSchema = z.string().datetime({ offset: true });

/** Integer pence amount (e.g. £40 = 4000). */
export const penceSchema = z.number().int().nonnegative();

/** Pagination cursor (opaque string). */
export const cursorSchema = z.string().min(1);
