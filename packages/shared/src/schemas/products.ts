import { z } from 'zod';
import { isoTimestampSchema, penceSchema, uuidSchema } from './common.js';

export const ProductCategorySchema = z.enum([
  'lora-set',
  'aso-oke-kimono',
  'fringe-bubu',
  'naya-jump-suit',
  'lumi-set',
  'jasmine-set',
  'seline-dress',
  'aso-oke-pant',
  'kora-bubu',
  'mina-set',
]);

export const ProductSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  category: ProductCategorySchema,
  description: z.string(),
  price: penceSchema,
  sizes: z.array(z.string()),
  images: z.array(z.string().url()),
  notifyMeEnabled: z.boolean(),
  featured: z.boolean(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const StockLabelSchema = z.enum(['low-stock']).nullable();

export const ProductWithStockSchema = ProductSchema.extend({
  inStock: z.boolean(),
  stockCount: z.number().int().nonnegative(),
  stockLabel: StockLabelSchema,
});

export const CreateProductRequestSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateProductRequestSchema = ProductSchema.omit({
  id: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const ProductFiltersSchema = z.object({
  category: ProductCategorySchema.optional(),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type StockLabel = z.infer<typeof StockLabelSchema>;
export type ProductWithStock = z.infer<typeof ProductWithStockSchema>;
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;
export type ProductFilters = z.infer<typeof ProductFiltersSchema>;
