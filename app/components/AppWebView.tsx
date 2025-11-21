/**
 * AppWebView Component
 *
 * 재사용 가능한 WebView 컴포넌트
 * - 각 탭에서 다른 경로로 렌더링
 * - 자동 인증 처리
 */

import { useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useAuth } from "@app/hooks/useAuth";

interface AppWebViewProps {
  path: string; // "/" or "/chat" or "/profile"
}

export function AppWebView({ path }: AppWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const { handleWebViewMessage } = useAuth(webViewRef);
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000";

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: `${webUrl}${path}` }}
      style={styles.webview}
      onMessage={handleWebViewMessage}
      // 성능 최적화
      cacheEnabled={true}
      cacheMode="LOAD_CACHE_ELSE_NETWORK"
      // JavaScript 활성화
      javaScriptEnabled={true}
      domStorageEnabled={true}
      // 에러 처리
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error("WebView error:", nativeEvent);
      }}
      onHttpError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error("WebView HTTP error:", nativeEvent.statusCode);
      }}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});
