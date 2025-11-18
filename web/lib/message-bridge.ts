/**
 * WebView Message Bridge System
 *
 * 확장 가능한 메시지 핸들러 시스템
 */

import { NativeToWebMessageType, type NativeToWebMessage } from "@sam-pyeong-oh/shared";

// 핸들러 타입 정의
type MessageHandler<T extends NativeToWebMessage = NativeToWebMessage> = (
  message: T
) => void | Promise<void>;

// 핸들러 레지스트리
class MessageBridge {
  private handlers: Map<NativeToWebMessageType, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private isInitialized = false;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  /**
   * 특정 메시지 타입에 핸들러 등록
   */
  on<T extends NativeToWebMessage>(type: T["type"], handler: MessageHandler<T>): () => void {
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
   * 메시지 발송 (디버깅/테스트용)
   */
  emit(message: NativeToWebMessage): void {
    this.handleMessage(message);
  }

  /**
   * 내부: 메시지 처리 -> 하나의 타입에 대해서 여러 핸들러 순회하면서 실행함.
   */
  private handleMessage(message: NativeToWebMessage): void {
    // 타입별 핸들러 모두실행
    const typeHandlers = this.handlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error);
        }
      });
    }

    // 글로벌 핸들러 실행
    this.globalHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error("Error in global message handler:", error);
      }
    });
  }

  /**
   * Window 메시지 이벤트 리스너 초기화
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.messageListener = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as NativeToWebMessage;
        this.handleMessage(message);
      } catch (error) {
        // 다른 출처의 메시지는 무시
        console.debug("Ignored non-bridge message:", error);
      }
    };

    window.addEventListener("message", this.messageListener);
    this.isInitialized = true;
  }

  /**
   * Window 메시지 이벤트 리스너 제거 및 모든 핸들러 정리
   */
  destroy(): void {
    if (this.messageListener) {
      window.removeEventListener("message", this.messageListener);
      this.messageListener = null;
    }
    this.handlers.clear();
    this.globalHandlers.clear();
    this.isInitialized = false;
  }

  /**
   * 모든 핸들러만 제거 (이벤트 리스너는 유지)
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
  }
}

// 싱글톤 인스턴스
export const messageBridge = new MessageBridge();
