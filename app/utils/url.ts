/**
 * URL Utilities
 *
 * Helper functions for URL management and WebView connection
 */

import { Platform } from "react-native";

/**
 * Environment-specific URL configuration
 */
interface UrlConfig {
  /**
   * Base URL for the web application
   */
  baseUrl: string;

  /**
   * Whether this is a development environment
   */
  isDevelopment: boolean;

  /**
   * Platform-specific adjustments
   */
  platform: "ios" | "android" | "web";
}

/**
 * Get the appropriate WebView URL based on environment and platform
 *
 * Priority:
 * 1. Environment variable (EXPO_PUBLIC_WEB_URL)
 * 2. Platform-specific defaults
 *
 * Android emulator note:
 * - Use 10.0.2.2 to access host machine's localhost
 * - Physical devices need the computer's local network IP (e.g., 192.168.x.x)
 *
 * iOS simulator note:
 * - Can use localhost directly
 * - Physical devices need the computer's local network IP
 *
 * @returns The WebView target URL
 */
export function getWebUrl(): string {
  // Check environment variable first
  const envUrl = process.env.EXPO_PUBLIC_WEB_URL;
  if (envUrl) {
    return validateAndNormalizeUrl(envUrl);
  }

  // Platform-specific defaults for development
  if (Platform.OS === "android") {
    // Android emulator accesses host machine via 10.0.2.2
    return "http://10.0.2.2:3000";
  }

  if (Platform.OS === "ios") {
    // iOS simulator can use localhost
    return "http://localhost:3000";
  }

  // Web platform (unlikely for WebView usage)
  return "http://localhost:3000";
}

/**
 * Validate and normalize URL string
 *
 * Ensures URL has proper protocol and format
 *
 * @param url - URL to validate
 * @returns Normalized URL
 * @throws Error if URL is invalid
 */
export function validateAndNormalizeUrl(url: string): string {
  try {
    // Remove trailing slash
    let normalized = url.trim().replace(/\/+$/, "");

    // Add protocol if missing
    if (!normalized.match(/^https?:\/\//)) {
      normalized = `http://${normalized}`;
    }

    // Validate URL format
    new URL(normalized);

    return normalized;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Get URL configuration for the current environment
 *
 * @returns URL configuration object
 */
export function getUrlConfig(): UrlConfig {
  return {
    baseUrl: getWebUrl(),
    isDevelopment: __DEV__,
    platform: Platform.OS as "ios" | "android" | "web",
  };
}

/**
 * Check if a URL is a local development URL
 *
 * @param url - URL to check
 * @returns true if URL is localhost or local IP
 */
export function isLocalUrl(url: string): boolean {
  const localPatterns = [
    /^https?:\/\/localhost/,
    /^https?:\/\/127\.0\.0\.1/,
    /^https?:\/\/10\.0\.2\.2/, // Android emulator
    /^https?:\/\/192\.168\./, // Local network
    /^https?:\/\/10\./, // Local network
    /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./, // Local network
  ];

  return localPatterns.some((pattern) => pattern.test(url));
}

/**
 * Build a full URL with path and query parameters
 *
 * @param base - Base URL
 * @param path - Path to append
 * @param params - Query parameters
 * @returns Full URL string
 */
export function buildUrl(
  base: string,
  path: string = "",
  params: Record<string, string | number | boolean> = {}
): string {
  const normalized = validateAndNormalizeUrl(base);
  const cleanPath = path.replace(/^\/+/, "");

  const url = new URL(`${normalized}/${cleanPath}`);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  return url.toString();
}

/**
 * Get development troubleshooting information
 *
 * Provides platform-specific debugging guidance
 *
 * @returns Troubleshooting message
 */
export function getDevTroubleshootingInfo(): string {
  const config = getUrlConfig();

  const platformSpecific =
    config.platform === "android"
      ? "Android 에뮬레이터를 사용 중입니다. 호스트 머신의 localhost는 10.0.2.2로 접근됩니다."
      : "iOS 시뮬레이터를 사용 중입니다. localhost로 직접 접근 가능합니다.";

  return `
현재 설정:
- URL: ${config.baseUrl}
- Platform: ${config.platform}
- Environment: ${config.isDevelopment ? "Development" : "Production"}

${platformSpecific}

실제 기기에서 테스트하는 경우:
1. 컴퓨터와 기기가 같은 WiFi 네트워크에 연결되어 있어야 합니다.
2. 컴퓨터의 로컬 IP 주소를 확인하세요 (예: 192.168.1.100).
3. EXPO_PUBLIC_WEB_URL을 해당 IP로 설정하세요 (예: http://192.168.1.100:3000).
  `.trim();
}
