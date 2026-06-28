import { z } from 'zod';
import { isoTimestampSchema, uuidSchema } from './common.js';

export const EnquirySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  email: z.string().email(),
  productId: uuidSchema.nullable(),
  message: z.string().min(1),
  createdAt: isoTimestampSchema,
});

export const CreateEnquiryRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  productId: uuidSchema.optional(),
  message: z.string().min(1).max(2000, 'Message must be 2000 characters or fewer'),
});

export const WaitlistEntrySchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  email: z.string().email(),
  createdAt: isoTimestampSchema,
});

export const CreateWaitlistRequestSchema = z.object({
  productId: uuidSchema,
  email: z.string().email(),
});

export type Enquiry = z.infer<typeof EnquirySchema>;
export type CreateEnquiryRequest = z.infer<typeof CreateEnquiryRequestSchema>;
export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;
export type CreateWaitlistRequest = z.infer<typeof CreateWaitlistRequestSchema>;
