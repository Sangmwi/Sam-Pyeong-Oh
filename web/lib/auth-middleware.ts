/**
 * Authentication Middleware for API Routes
 *
 * Validates JWT token and extracts user information
 */

import { NextRequest } from 'next/server';
import { extractTokenFromHeader, verifyToken, type JWTPayload } from './jwt';

export interface AuthenticatedRequest {
  user: JWTPayload;
}

/**
 * Authorize request and extract user from JWT
 *
 * @returns User payload if authenticated, null otherwise
 */
export async function authorize(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  return payload;
}

/**
 * Require authentication for API route
 *
 * @throws Response with 401 status if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<JWTPayload> {
  const user = await authorize(req);

  if (!user) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return user;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, code: 'UNAUTHORIZED' },
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, code: 'FORBIDDEN' },
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
