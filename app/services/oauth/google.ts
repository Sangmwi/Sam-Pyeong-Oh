/**
 * Google OAuth Service
 *
 * Handles Google authentication flow using expo-auth-session
 */

import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { GOOGLE_OAUTH_CONFIG } from "@app/config/oauth";
import type { IOAuthProvider, OAuthResult } from "./types";
import { OAuthError } from "./types";

/**
 * Google OAuth implementation using expo-auth-session
 *
 * Setup requirements:
 * 1. Create OAuth 2.0 credentials in Google Cloud Console
 * 2. Add redirect URIs for each platform
 * 3. Set environment variables in .env
 */
export class GoogleOAuthProvider implements IOAuthProvider {
  readonly name = "google" as const;

  async authenticate(): Promise<OAuthResult> {
    // Use mock if configured
    if (GOOGLE_OAUTH_CONFIG.useMock) {
      return this.mockAuthenticate();
    }

    try {
      // Get appropriate client ID for platform
      const clientId = this.getClientId();

      if (!clientId) {
        throw new Error("Google OAuth 클라이언트 ID가 설정되지 않았습니다.");
      }

      // Configure redirect URI
      const redirectUri = makeRedirectUri({
        scheme: "sampyeongoh",
      });

      console.log("[GoogleOAuth] Redirect URI:", redirectUri);
      console.log("[GoogleOAuth] Client ID:", clientId.substring(0, 20) + "...");

      // Build authorization URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "token",
        scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
      }).toString()}`;

      // Start OAuth flow using WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== "success") {
        throw new Error(`OAuth 인증 실패: ${result.type}`);
      }

      // Extract access token from URL
      const url = new URL(result.url);
      const params = new URLSearchParams(url.hash.substring(1)); // Remove # from hash
      const accessToken = params.get("access_token");
      const expiresIn = params.get("expires_in");

      if (!accessToken) {
        throw new Error("액세스 토큰을 받을 수 없습니다.");
      }

      console.log("[GoogleOAuth] Authentication successful");

      // Fetch user info from Google
      const userInfo = await this.fetchUserInfo(accessToken);

      // Calculate token expiration
      const expiresAt = expiresIn
        ? Date.now() + parseInt(expiresIn, 10) * 1000
        : Date.now() + 60 * 60 * 1000; // Default 1 hour

      return {
        token: accessToken,
        userId: userInfo.id,
        expiresAt,
        provider: this.name,
      };
    } catch (error) {
      console.error("[GoogleOAuth] Authentication error:", error);
      throw new OAuthError(
        error instanceof Error ? error.message : "Google 로그인에 실패했습니다.",
        this.name,
        error
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    // Check if client ID is configured
    const clientId = this.getClientId();
    return GOOGLE_OAUTH_CONFIG.useMock || !!clientId;
  }

  /**
   * Get appropriate client ID for current platform
   */
  private getClientId(): string {
    if (Platform.OS === "android") {
      return GOOGLE_OAUTH_CONFIG.androidClientId;
    }
    if (Platform.OS === "ios") {
      return GOOGLE_OAUTH_CONFIG.iosClientId;
    }
    // Fallback to Expo client ID for development
    return GOOGLE_OAUTH_CONFIG.expoClientId;
  }

  /**
   * Fetch user information from Google API
   */
  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("사용자 정보를 가져올 수 없습니다.");
    }

    const data: unknown = await response.json();
    return data as GoogleUserInfo;
  }

  /**
   * Mock authentication for development
   */
  private async mockAuthenticate(): Promise<OAuthResult> {
    console.warn("[GoogleOAuth] Using mock authentication");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockToken = `google-mock-${Date.now()}`;
    const mockUserId = `google_user_${Math.random().toString(36).substring(7)}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    return {
      token: mockToken,
      userId: mockUserId,
      expiresAt,
      provider: this.name,
    };
  }
}

/**
 * Google user info response
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * Singleton instance
 */
export const googleOAuth = new GoogleOAuthProvider();
