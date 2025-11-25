/**
 * AppWebView Component
 *
 * 재사용 가능한 WebView 컴포넌트
 * - 각 탭에서 다른 경로로 렌더링
 * - 자동 인증 처리
 */

import { useRef, useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useSupabaseAuth } from "@app/hooks/useSupabaseAuth";
import { WEBVIEW_INJECTED_JAVASCRIPT } from "@app/config/webview";

interface AppWebViewProps {
  path: string; // "/" or "/chat" or "/profile"
}

export function AppWebView({ path }: AppWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  // Hooks로 모든 로직 위임 (Sync 상태 포함)
  const { handleWebViewMessage, isAuthenticated, isSessionSynced } = useSupabaseAuth(webViewRef);
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000";

  // WebView 자체 로드 상태 (이건 UI 관련이라 컴포넌트에 남겨둠)
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);

  // 로딩 표시 조건:
  // 1. WebView 로딩이 안 끝났거나
  // 2. 로그인은 되어 있는데 세션 동기화가 아직 안 끝난 경우
  const showLoading = !isWebViewLoaded || (isAuthenticated && !isSessionSynced);

  // 안전장치: 5초 뒤에도 동기화 안되면 로딩 해제 (Hook 내부에서 처리할 수도 있지만 UI 제어권은 여기 둠)
  // 하지만 Hook 내부 로직이 견고해졌으므로 여기서는 순수 렌더링만 담당해도 됨

  return (
    <View style={styles.container}>
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
        // 페이지 로드 완료 시
        onLoadEnd={() => {
          setIsWebViewLoaded(true);
        }}
        // 에러 처리
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView error:", nativeEvent);
          setIsWebViewLoaded(true); // 에러 나도 로딩은 끔
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView HTTP error:", nativeEvent.statusCode);
        }}
      />

      {/* Loading Overlay */}
      {showLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#78866B" />
          <Text style={styles.loadingText}>
            {isAuthenticated && !isSessionSynced ? "동기화 중..." : "로딩 중..."}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FDFCF8", // Background Color (Khaki Theme Off-white)
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#8A9385", // Text Sub Color
    fontWeight: "500",
  },
});
