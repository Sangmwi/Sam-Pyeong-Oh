/**
 * API Data Transfer Objects (DTOs)
 *
 * Type definitions for API request/response payloads
 */

// ============================================================================
// User Types
// ============================================================================

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  provider: 'google' | 'kakao';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  email: string;
  name?: string;
  provider: 'google' | 'kakao';
  providerId: string;
}

// ============================================================================
// Thread Types
// ============================================================================

export interface ThreadDTO {
  id: number;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface CreateThreadDTO {
  title: string;
}

export interface UpdateThreadDTO {
  title?: string;
}

export interface ThreadWithMessagesDTO extends ThreadDTO {
  messages: MessageDTO[];
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageDTO {
  id: number;
  threadId: number;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface CreateMessageDTO {
  threadId: number;
  role: MessageRole;
  content: string;
}

export interface UpdateMessageDTO {
  content?: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthTokenDTO {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface VerifyTokenDTO {
  token: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

// ============================================================================
// AI/OpenAI Types
// ============================================================================

export interface AICompletionRequestDTO {
  threadId: number;
  userMessage: string;
}

export interface AICompletionResponseDTO {
  messageId: number;
  content: string;
  role: MessageRole;
  createdAt: string;
}

export interface AIRecommendationRequestDTO {
  context: string;
  count?: number;
}

export interface AIRecommendationResponseDTO {
  recommendations: string[];
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface APIErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
