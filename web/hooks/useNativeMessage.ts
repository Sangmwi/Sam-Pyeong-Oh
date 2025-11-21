/**
 * Custom Hook: Native WebView 메시지 리스너
 *
 * 확장 가능한 메시지 핸들러 시스템 사용
 */

import { NativeToWebMessageType } from "@sam-pyeong-oh/shared";
import { useAuthStore } from "@/store/auth";
import { useMessageHandler } from "./useMessageHandler";

export function useNativeMessage() {
  const { setAuth, clearAuth } = useAuthStore();

  // AUTH_TOKEN 메시지 처리
  useMessageHandler(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      if (message.type === NativeToWebMessageType.AUTH_TOKEN) {
        const { token, userId, expiresAt, provider } = message.payload;
        setAuth({ token, userId, expiresAt, provider });
      }
    },
    [setAuth]
  );

  // LOGOUT_SUCCESS 메시지 처리
  useMessageHandler(
    NativeToWebMessageType.LOGOUT_SUCCESS,
    () => {
      clearAuth();
    },
    [clearAuth]
  );

  // AUTH_ERROR 메시지 처리
  useMessageHandler(
    NativeToWebMessageType.AUTH_ERROR,
    (message) => {
      if (message.type === NativeToWebMessageType.AUTH_ERROR) {
        console.error("Auth error from native:", message.payload.error);
        // TODO: 사용자에게 에러 표시
      }
    },
    []
  );
}
