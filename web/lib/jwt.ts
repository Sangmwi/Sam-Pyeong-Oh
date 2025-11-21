/**
 * JWT Utilities (Server-Side Only)
 *
 * Token generation and verification for API routes
 */

import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN: string = (process.env.JWT_EXPIRES_IN || "7d") as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export interface JWTPayload {
  userId: string;
  email: string;
  provider: "google";
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

/**
 * Get token expiry timestamp (milliseconds)
 */
export function getTokenExpiry(expiresInSeconds: number = 7 * 24 * 60 * 60): number {
  return Date.now() + expiresInSeconds * 1000;
}
