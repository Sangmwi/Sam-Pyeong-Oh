/**
 * Zod Validation Schemas
 *
 * Runtime validation for API requests and data integrity
 */

import { z } from "zod";

// ============================================================================
// Message Schemas
// ============================================================================

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);

export const createMessageSchema = z.object({
  threadId: z.number().int().positive(),
  role: messageRoleSchema,
  content: z.string().min(1).max(10000),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
});

export const messageIdSchema = z.number().int().positive();

// ============================================================================
// Thread Schemas
// ============================================================================

export const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const threadIdSchema = z.number().int().positive();

// ============================================================================
// User Schemas
// ============================================================================

export const providerSchema = z.enum(["google", "kakao"]);

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  provider: providerSchema,
  providerId: z.string().min(1),
});

export const userIdSchema = z.string().min(1);

// ============================================================================
// Authentication Schemas
// ============================================================================

export const verifyTokenSchema = z.object({
  token: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ============================================================================
// AI/OpenAI Schemas
// ============================================================================

export const aiCompletionRequestSchema = z.object({
  threadId: z.number().int().positive(),
  userMessage: z.string().min(1).max(5000),
});

export const aiRecommendationRequestSchema = z.object({
  context: z.string().min(1).max(2000),
  count: z.number().int().min(1).max(10).optional().default(5),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type AICompletionRequest = z.infer<typeof aiCompletionRequestSchema>;
export type AIRecommendationRequest = z.infer<typeof aiRecommendationRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
