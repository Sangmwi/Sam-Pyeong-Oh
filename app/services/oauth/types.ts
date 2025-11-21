/**
 * OAuth Service Types
 *
 * Shared types for OAuth implementations
 */

import type { OAuthProvider } from "@app/config/constants";

/**
 * Result of successful OAuth authentication
 */
export interface OAuthResult {
  /**
   * JWT token from the OAuth provider
   */
  token: string;

  /**
   * User ID from the OAuth provider
   */
  userId: string;

  /**
   * Token expiration timestamp (milliseconds since epoch)
   */
  expiresAt: number;

  /**
   * OAuth provider that issued the token
   */
  provider: OAuthProvider;
}

/**
 * OAuth error with provider context
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public provider: OAuthProvider,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

/**
 * OAuth provider interface
 *
 * All OAuth implementations must conform to this interface
 */
export interface IOAuthProvider {
  /**
   * Provider name
   */
  readonly name: OAuthProvider;

  /**
   * Initiate OAuth flow and return authentication result
   *
   * @throws {OAuthError} If authentication fails
   */
  authenticate(): Promise<OAuthResult>;

  /**
   * Check if the provider is available on the current platform
   */
  isAvailable(): Promise<boolean>;
}
