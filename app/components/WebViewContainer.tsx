/**
 * WebView Container Component
 *
 * Wrapper component for react-native-webview with error handling
 */

import React, { forwardRef, useCallback, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewProps } from "react-native-webview";
import { getWebViewConfig } from "@app/config/webview";
import { getWebUrl } from "@app/utils/url";
import { extractErrorDetails } from "@app/types/webview";

interface WebViewContainerProps {
  /**
   * Callback when WebView encounters an error
   */
  onError?: (errorMessage: string, errorDetails: string) => void;

  /**
   * Additional WebView props to override defaults
   */
  webViewProps?: Partial<WebViewProps>;
}

/**
 * WebView Container Component
 *
 * Features:
 * - Pre-configured with optimal settings
 * - Automatic error handling and reporting
 * - Loading state management
 * - Ref forwarding for parent control
 */
export const WebViewContainer = forwardRef<WebView, WebViewContainerProps>(
  ({ onError, webViewProps }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const webUrl = getWebUrl();
    const config = getWebViewConfig();

    /**
     * Handle WebView errors
     */
    const handleError = useCallback(
      (event: any) => {
        const details = extractErrorDetails(event);
        console.error("[WebView] Error:", details);

        const errorMessage = `연결 실패: ${details.description || details.code || "알 수 없는 오류"}`;
        const errorDetails = `URL: ${details.url}`;

        onError?.(errorMessage, errorDetails);
        setIsLoading(false);
      },
      [onError]
    );

    /**
     * Handle HTTP errors
     */
    const handleHttpError = useCallback(
      (event: any) => {
        const details = extractErrorDetails(event);
        console.error("[WebView] HTTP Error:", details);

        if (details.statusCode && details.statusCode >= 400) {
          const errorMessage = `HTTP 오류: ${details.statusCode}`;
          const errorDetails = `서버가 오류를 반환했습니다.`;

          onError?.(errorMessage, errorDetails);
          setIsLoading(false);
        }
      },
      [onError]
    );

    /**
     * Handle load start
     */
    const handleLoadStart = useCallback(() => {
      setIsLoading(true);
    }, []);

    /**
     * Handle load end
     */
    const handleLoadEnd = useCallback(() => {
      setIsLoading(false);
    }, []);

    return (
      <View className="flex-1">
        <WebView
          ref={ref}
          source={{ uri: webUrl }}
          className="flex-1"
          onError={handleError}
          onHttpError={handleHttpError}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          {...config}
          {...webViewProps}
        />
      </View>
    );
  }
);

WebViewContainer.displayName = "WebViewContainer";
