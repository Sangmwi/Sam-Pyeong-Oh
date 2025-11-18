/**
 * Authentication Utilities
 *
 * Pure functions for JWT handling, token validation, etc.
 */

// ============================================================================
// Token Validation
// ============================================================================

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

export function getTokenExpiryTime(expiresInSeconds: number): number {
  return Date.now() + expiresInSeconds * 1000;
}

export function parseJWTPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

// ============================================================================
// Authorization Header Helpers
// ============================================================================

export function createAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

// ============================================================================
// User ID Extraction
// ============================================================================

export interface JWTPayload {
  userId: string;
  email?: string;
  exp?: number;
  iat?: number;
}

export function extractUserIdFromToken(token: string): string | null {
  const payload = parseJWTPayload<JWTPayload>(token);
  return payload?.userId ?? null;
}
