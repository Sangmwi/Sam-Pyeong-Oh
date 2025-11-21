/**
 * WebView Configuration
 *
 * Centralized WebView settings for consistent behavior across the app
 */

import type { WebViewProps } from "react-native-webview";

/**
 * Default WebView configuration
 *
 * These settings optimize for:
 * - Security: Controlled script execution
 * - Performance: Caching and rendering optimization
 * - UX: Loading states and navigation gestures
 * - Compatibility: Cross-platform consistency
 */
export const WEBVIEW_CONFIG: Partial<WebViewProps> = {
  // JavaScript & DOM
  javaScriptEnabled: true,
  domStorageEnabled: true,

  // Loading & Caching
  startInLoadingState: true,
  cacheEnabled: true,
  cacheMode: "LOAD_DEFAULT", // Android only

  // Rendering & Scaling
  scalesPageToFit: true, // Android only
  automaticallyAdjustContentInsets: false, // iOS only

  // Navigation
  allowsBackForwardNavigationGestures: true, // iOS only

  // Security
  allowsInlineMediaPlayback: true, // iOS only
  mediaPlaybackRequiresUserAction: false,

  // Performance
  androidLayerType: "hardware", // Android only - use hardware acceleration

  // Network
  mixedContentMode: "never", // Android only - block mixed content for security
} as const;

/**
 * WebView configuration for development environment
 *
 * More permissive settings for local development
 */
export const WEBVIEW_DEV_CONFIG: Partial<WebViewProps> = {
  ...WEBVIEW_CONFIG,

  // Allow debugging
  webviewDebuggingEnabled: true, // Android only

  // More permissive caching for faster reload
  cacheMode: "LOAD_CACHE_ELSE_NETWORK",

  // Allow mixed content in dev (http + https)
  mixedContentMode: "compatibility",
} as const;

/**
 * Get appropriate WebView configuration based on environment
 */
export function getWebViewConfig(): Partial<WebViewProps> {
  const isDevelopment = __DEV__;
  return isDevelopment ? WEBVIEW_DEV_CONFIG : WEBVIEW_CONFIG;
}

/**
 * WebView injected JavaScript for additional functionality
 *
 * This script runs in the WebView context and can:
 * - Add custom event listeners
 * - Enhance navigation behavior
 * - Implement custom error handling
 */
export const WEBVIEW_INJECTED_JAVASCRIPT = `
  (function() {
    // Prevent zooming on iOS
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(meta);

    // Log console messages to React Native (helpful for debugging)
    const originalLog = console.log;
    console.log = function(...args) {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'CONSOLE_LOG',
        payload: { message: args.join(' ') }
      }));
      originalLog.apply(console, args);
    };

    // Notify React Native when page is fully loaded
    window.addEventListener('load', function() {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'PAGE_LOADED',
        payload: { url: window.location.href }
      }));
    });

    // Handle unhandled errors
    window.addEventListener('error', function(event) {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'PAGE_ERROR',
        payload: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      }));
    });
  })();
  true; // Required for iOS
`;

/**
 * User agent string customization (optional)
 *
 * Useful for:
 * - Server-side detection of mobile app
 * - Analytics tracking
 * - Feature detection
 */
export const CUSTOM_USER_AGENT = "SamPyeongOh/1.0.0 (Expo; React Native)";
