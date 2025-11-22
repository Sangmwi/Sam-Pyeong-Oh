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
import { useSupabaseAuth } from "@app/hooks/useSupabaseAuth";
import { WEBVIEW_INJECTED_JAVASCRIPT } from "@app/config/webview";

interface AppWebViewProps {
  path: string; // "/" or "/chat" or "/profile"
}

export function AppWebView({ path }: AppWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  // useAuth 대신 useSupabaseAuth 사용
  const { handleWebViewMessage } = useSupabaseAuth(webViewRef);
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000";

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: `${webUrl}${path}` }}
      style={styles.webview}
      onMessage={handleWebViewMessage}
      injectedJavaScript={WEBVIEW_INJECTED_JAVASCRIPT}
      // 성능 최적화
      cacheEnabled={true}
      cacheMode="LOAD_CACHE_ELSE_NETWORK"
      // JavaScript 활성화
      javaScriptEnabled={true}
      domStorageEnabled={true}
      // 페이지 로드 완료 시 테스트
      onLoadEnd={() => {
        console.log("[AppWebView] Page loaded, testing injection...");
        // 간단한 테스트 injection
        webViewRef.current?.injectJavaScript(`
          console.log('[AppWebView Test] Injection successful!');
          window.postMessage(JSON.stringify({ type: 'TEST_INJECTION', payload: {} }), '*');
          true;
        `);
      }}
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
