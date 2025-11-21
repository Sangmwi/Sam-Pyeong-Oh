/**
 * OAuth Configuration (Google Only)
 *
 * Environment-specific OAuth credentials and settings
 */

/**
 * Google OAuth Configuration
 *
 * Get these values from Google Cloud Console:
 * https://console.cloud.google.com/apis/credentials
 */
export const GOOGLE_OAUTH_CONFIG = {
  /**
   * OAuth 2.0 Client ID for Android
   * Format: xxxxx.apps.googleusercontent.com
   */
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",

  /**
   * OAuth 2.0 Client ID for iOS
   * Format: xxxxx.apps.googleusercontent.com
   */
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",

  /**
   * OAuth 2.0 Client ID for Expo Go (development)
   * Format: xxxxx.apps.googleusercontent.com
   */
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || "",

  /**
   * OAuth scopes to request
   */
  scopes: ["profile", "email"] as string[],

  /**
   * Whether to use mock authentication in development
   */
  useMock: process.env.EXPO_PUBLIC_USE_MOCK_OAUTH === "true",
} as const;

/**
 * Validate OAuth configuration
 *
 * Checks if required Google credentials are set
 */
export function validateOAuthConfig(): {
  google: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let googleValid = true;

  // Skip validation if using mock
  if (GOOGLE_OAUTH_CONFIG.useMock) {
    console.warn("[OAuth] Using mock authentication - set credentials for production");
    return { google: true, errors: [] };
  }

  // Validate Google OAuth
  if (!GOOGLE_OAUTH_CONFIG.androidClientId && !GOOGLE_OAUTH_CONFIG.iosClientId) {
    errors.push("Google OAuth: androidClientId 또는 iosClientId가 설정되지 않았습니다.");
    googleValid = false;
  }

  if (errors.length > 0) {
    console.error("[OAuth] Configuration errors:", errors);
  }

  return { google: googleValid, errors };
}
