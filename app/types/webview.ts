/**
 * WebView Type Definitions
 *
 * Type-safe wrappers for react-native-webview events and messages
 */

import type { WebViewMessageEvent } from "react-native-webview";
import type { SyntheticEvent } from "react";

// Re-export commonly used types from react-native-webview
export type { WebViewMessageEvent };

/**
 * Type-safe wrapper for WebView message events
 */
export type WebViewMessage = WebViewMessageEvent;

/**
 * WebView error event (generic)
 */
export type WebViewError = SyntheticEvent<any, any>;

/**
 * WebView HTTP error event
 */
export type WebViewHttpError = SyntheticEvent<any, any>;

/**
 * WebView navigation event
 */
export type WebViewNavigation = SyntheticEvent<any, any>;

/**
 * WebView error details extracted from native event
 */
export interface WebViewErrorDetails {
  code?: number;
  description?: string;
  statusCode?: number;
  url: string;
}

/**
 * Extract error details from WebView error event
 */
export function extractErrorDetails(event: WebViewError | WebViewHttpError): WebViewErrorDetails {
  const { nativeEvent } = event;

  if ("statusCode" in nativeEvent) {
    // HTTP error
    return {
      statusCode: nativeEvent.statusCode,
      url: nativeEvent.url || "",
      description: `HTTP error: ${nativeEvent.statusCode}`,
    };
  }

  // General error
  return {
    code: nativeEvent.code,
    description: nativeEvent.description || nativeEvent.message || "Unknown error",
    url: nativeEvent.url || "",
  };
}
