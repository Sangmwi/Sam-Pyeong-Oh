/**
 * AppWebView Component
 *
 * 재사용 가능한 WebView 컴포넌트
 * - 각 탭에서 다른 경로로 렌더링
 * - 자동 인증 처리
 */

import { useRef, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
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

  return (
    <View className="flex-1">
      <WebView
        ref={webViewRef}
        source={{ uri: `${webUrl}${path}` }}
        className="flex-1"
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
        <View className="absolute inset-0 bg-[#FDFCF8] justify-center items-center z-10">
          <ActivityIndicator size="large" color="#78866B" />
          <Text className="mt-3 text-sm text-[#8A9385] font-medium">
            {isAuthenticated && !isSessionSynced ? "동기화 중..." : "로딩 중..."}
          </Text>
        </View>
      )}
    </View>
  );
}
