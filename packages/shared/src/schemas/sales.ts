import { z } from 'zod';
import { isoTimestampSchema, penceSchema, uuidSchema } from './common.js';

export const SaleSchema = z.object({
  id: uuidSchema,
  batchItemId: uuidSchema,
  salePrice: penceSchema,
  soldAt: isoTimestampSchema,
  customerName: z.string().nullable(),
  customerContact: z.string().nullable(),
  createdAt: isoTimestampSchema,
});

export const RecordSaleRequestSchema = z.object({
  salePrice: penceSchema.optional(),
  soldAt: isoTimestampSchema.optional(),
  customerName: z.string().max(200, 'customerName must be 200 characters or fewer').optional(),
  customerContact: z.string().max(200, 'customerContact must be 200 characters or fewer').optional(),
});

export type Sale = z.infer<typeof SaleSchema>;
export type RecordSaleRequest = z.infer<typeof RecordSaleRequestSchema>;
