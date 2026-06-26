import { z } from 'zod';
import { isoTimestampSchema, penceSchema, uuidSchema } from './common.js';

export const BatchItemStatusSchema = z.enum(['sellable', 'sold', 'faulty']);

export const ProductionCostSchema = z.object({
  materials: penceSchema,
  logistics: penceSchema,
  salary: penceSchema,
  other: penceSchema,
});

export const ProductionBatchSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  productionCost: ProductionCostSchema,
  marketingCost: penceSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const CreateBatchRequestSchema = ProductionBatchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateBatchRequestSchema = CreateBatchRequestSchema.partial();

export const BatchItemSchema = z.object({
  id: uuidSchema,
  batchId: uuidSchema,
  productId: uuidSchema,
  plannedSalePrice: penceSchema,
  status: BatchItemStatusSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const CreateBatchItemRequestSchema = z.object({
  productId: uuidSchema,
  plannedSalePrice: penceSchema.optional(),
});

export const CreateBatchItemsBulkRequestSchema = z.object({
  items: z.array(CreateBatchItemRequestSchema).min(1),
});

export const UpdateBatchItemRequestSchema = BatchItemSchema.pick({
  plannedSalePrice: true,
  status: true,
}).partial();

export const BatchTotalsSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  expectedRevenue: penceSchema,
  actualRevenue: penceSchema,
  loss: penceSchema,
  expectedProfit: z.number().int(),
  profitSoFar: z.number().int(),
});

export const ProductionBatchWithTotalsSchema = ProductionBatchSchema.extend({
  totals: BatchTotalsSchema,
});

export type BatchItemStatus = z.infer<typeof BatchItemStatusSchema>;
export type ProductionCost = z.infer<typeof ProductionCostSchema>;
export type ProductionBatch = z.infer<typeof ProductionBatchSchema>;
export type CreateBatchRequest = z.infer<typeof CreateBatchRequestSchema>;
export type UpdateBatchRequest = z.infer<typeof UpdateBatchRequestSchema>;
export type BatchItem = z.infer<typeof BatchItemSchema>;
export type CreateBatchItemRequest = z.infer<typeof CreateBatchItemRequestSchema>;
export type CreateBatchItemsBulkRequest = z.infer<typeof CreateBatchItemsBulkRequestSchema>;
export type UpdateBatchItemRequest = z.infer<typeof UpdateBatchItemRequestSchema>;
export type BatchTotals = z.infer<typeof BatchTotalsSchema>;
export type ProductionBatchWithTotals = z.infer<typeof ProductionBatchWithTotalsSchema>;
