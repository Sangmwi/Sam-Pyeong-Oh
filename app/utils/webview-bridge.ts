/**
 * WebView Bridge System (Native Side)
 *
 * 확장 가능한 메시지 핸들러 시스템 - Web과 동일한 구조
 */

import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import {
  WebToNativeMessageType,
  type NativeToWebMessage,
  type WebToNativeMessage,
} from "@sam-pyeong-oh/shared";
import type { WebViewMessage } from "@app/types/webview";

// 핸들러 타입 정의
type MessageHandler<T extends WebToNativeMessage = WebToNativeMessage> = (
  message: T
) => void | Promise<void>;

/**
 * WebView Message Bridge (Native Side)
 *
 * Features:
 * - Type-safe message handling
 * - Multiple handlers per message type
 * - Global message handlers
 * - Automatic cleanup
 */
class WebViewBridge {
  private handlers: Map<WebToNativeMessageType, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private webViewRef: RefObject<WebView | null> | null = null;

  /**
   * Initialize bridge with WebView reference
   */
  initialize(webViewRef: RefObject<WebView | null>): void {
    this.webViewRef = webViewRef;
  }

  /**
   * 특정 메시지 타입에 핸들러 등록
   */
  on<T extends WebToNativeMessage>(
    type: T["type"],
    handler: MessageHandler<T>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);

    // Cleanup 함수 반환
    return () => {
      this.handlers.get(type)?.delete(handler as MessageHandler);
    };
  }

  /**
   * 모든 메시지에 대한 글로벌 핸들러 등록
   */
  onAll(handler: MessageHandler): () => void {
    this.globalHandlers.add(handler);

    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Native → Web 메시지 전송
   */
  sendMessage(message: NativeToWebMessage): void {
    try {
      if (!this.webViewRef?.current) {
        console.warn("[WebViewBridge] WebView ref not available");
        return;
      }

      const serialized = JSON.stringify(message);
      this.webViewRef.current.postMessage(serialized);
      console.log(`[WebViewBridge] Sent to Web:`, message.type);
    } catch (error) {
      console.error("[WebViewBridge] Failed to send message:", error);
    }
  }

  /**
   * Web → Native 메시지 처리
   */
  handleMessage(event: WebViewMessage): void {
    try {
      const { data } = event.nativeEvent;
      const message: WebToNativeMessage = JSON.parse(data);
      console.log(`[WebViewBridge] Received from Web:`, message.type);

      // 타입별 핸들러 실행
      const typeHandlers = this.handlers.get(message.type);
      if (typeHandlers) {
        typeHandlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            console.error(`[WebViewBridge] Handler error for ${message.type}:`, error);
          }
        });
      }

      // 글로벌 핸들러 실행
      this.globalHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error("[WebViewBridge] Global handler error:", error);
        }
      });
    } catch (error) {
      console.error("[WebViewBridge] Failed to parse message:", error);
    }
  }

  /**
   * 메시지 발송 (디버깅/테스트용)
   */
  emit(message: WebToNativeMessage): void {
    this.handleMessage({
      nativeEvent: { data: JSON.stringify(message) },
    } as WebViewMessage);
  }

  /**
   * 모든 핸들러 제거
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
  }

  /**
   * Bridge 완전 정리 (ref 포함)
   */
  destroy(): void {
    this.clear();
    this.webViewRef = null;
  }
}

// 싱글톤 인스턴스
export const webViewBridge = new WebViewBridge();

// Legacy functions for backward compatibility (deprecated)
/** @deprecated Use webViewBridge.sendMessage() instead */
export function sendMessageToWebView(
  webViewRef: RefObject<WebView | null>,
  message: NativeToWebMessage
): void {
  webViewBridge.initialize(webViewRef);
  webViewBridge.sendMessage(message);
}

/** @deprecated Use webViewBridge.handleMessage() instead */
export function parseWebViewMessage(event: WebViewMessage): WebToNativeMessage | null {
  try {
    const { data } = event.nativeEvent;
    return JSON.parse(data);
  } catch {
    return null;
  }
}
