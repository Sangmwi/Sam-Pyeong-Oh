/**
 * OAuth Service (Google Only)
 *
 * Simplified OAuth interface for Google authentication
 */

import type { OAuthProvider } from "@app/config/constants";
import type { IOAuthProvider, OAuthResult } from "./types";
import { googleOAuth } from "./google";
import { OAuthError } from "./types";

/**
 * OAuth provider registry (Google only)
 */
const providers: Record<OAuthProvider, IOAuthProvider> = {
  google: googleOAuth,
};

/**
 * OAuth Service
 *
 * Provides unified access to all OAuth providers
 */
export class OAuthService {
  /**
   * Authenticate with the specified provider
   *
   * @param provider - OAuth provider to use
   * @returns Authentication result
   * @throws {OAuthError} If authentication fails
   */
  static async login(provider: OAuthProvider): Promise<OAuthResult> {
    const providerInstance = providers[provider];

    if (!providerInstance) {
      throw new OAuthError(`지원하지 않는 로그인 방식입니다: ${provider}`, provider);
    }

    // Check if provider is available
    const isAvailable = await providerInstance.isAvailable();
    if (!isAvailable) {
      throw new OAuthError(`${provider} 로그인을 사용할 수 없습니다.`, provider);
    }

    // Execute authentication flow
    return providerInstance.authenticate();
  }

  /**
   * Check if a provider is available
   *
   * @param provider - OAuth provider to check
   * @returns true if provider is available
   */
  static async isProviderAvailable(provider: OAuthProvider): Promise<boolean> {
    const providerInstance = providers[provider];
    if (!providerInstance) {
      return false;
    }
    return providerInstance.isAvailable();
  }

  /**
   * Get all available providers
   *
   * @returns Array of available provider names
   */
  static async getAvailableProviders(): Promise<OAuthProvider[]> {
    const availableProviders: OAuthProvider[] = [];

    for (const [name, provider] of Object.entries(providers)) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        availableProviders.push(name as OAuthProvider);
      }
    }

    return availableProviders;
  }
}

// Re-export types for convenience
export type { OAuthResult, IOAuthProvider } from "./types";
export { OAuthError } from "./types";
