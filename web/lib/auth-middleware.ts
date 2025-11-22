/**
 * Authentication Middleware for API Routes (Supabase Auth)
 *
 * Validates Supabase session token and extracts user information
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * Extract token from Authorization header
 */
function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

/**
 * Authorize request and extract user from Supabase session
 *
 * @returns User information if authenticated, null otherwise
 */
export async function authorize(req: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  try {
    const supabase = await createClient();

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("[Auth Middleware] Invalid token:", error);
      return null;
    }

    return {
      userId: user.id,
      email: user.email || "",
    };
  } catch (error) {
    console.error("[Auth Middleware] Authorization error:", error);
    return null;
  }
}

/**
 * Require authentication for API route
 *
 * @throws Response with 401 status if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await authorize(req);

  if (!user) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: { message: "Unauthorized", code: "UNAUTHORIZED" },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return user;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = "Unauthorized") {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, code: "UNAUTHORIZED" },
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = "Forbidden") {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, code: "FORBIDDEN" },
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}
