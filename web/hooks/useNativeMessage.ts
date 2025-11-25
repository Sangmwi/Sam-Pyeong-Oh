/**
 * Custom Hook: Native WebView 메시지 리스너
 *
 * Web → Native 메시지 전송 유틸리티
 */

import { useCallback } from "react";
import type { WebToNativeMessage } from "@sam-pyeong-oh/shared";

export function useNativeMessage() {
  /**
   * Web → Native 메시지 전송
   */
  const sendMessage = useCallback((message: WebToNativeMessage) => {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    } catch (error) {
      console.error("[useNativeMessage] Failed to send message:", error);
    }
  }, []); // 의존성 없음 - 함수는 항상 동일

  return {
    sendMessage,
  };
}
