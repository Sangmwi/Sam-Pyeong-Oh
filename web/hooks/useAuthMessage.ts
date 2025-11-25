/**
 * Custom Hook: 인증 관련 메시지 처리
 *
 * Native에서 전송되는 인증 관련 메시지(AUTH_TOKEN, LOGOUT_SUCCESS, AUTH_ERROR)를 처리합니다.
 */

import { useEffect } from "react";
import {
  NativeToWebMessageType,
  createWebAppReadyMessage,
  type AuthErrorMessage,
  type AuthTokenMessage,
  type LogoutSuccessMessage,
} from "@sam-pyeong-oh/shared";
import { useAuthStore } from "@/store/auth";
import { useMessageHandler } from "./useMessageHandler";
import { useNativeMessage } from "./useNativeMessage";

export function useAuthMessage() {
  const { setAuth, clearAuth } = useAuthStore();
  const { sendMessage } = useNativeMessage();

  // 앱 초기화 시 준비 완료 메시지 전송
  useEffect(() => {
    sendMessage(createWebAppReadyMessage());
  }, [sendMessage]);

  // AUTH_TOKEN 메시지 처리
  useMessageHandler<AuthTokenMessage>(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      const { token, userId, expiresAt, provider } = message.payload;
      setAuth({ token, userId, expiresAt, provider });
    },
    [setAuth]
  );

  // LOGOUT_SUCCESS 메시지 처리
  useMessageHandler<LogoutSuccessMessage>(
    NativeToWebMessageType.LOGOUT_SUCCESS,
    () => {
      clearAuth();
    },
    [clearAuth]
  );

  // AUTH_ERROR 메시지 처리
  useMessageHandler<AuthErrorMessage>(
    NativeToWebMessageType.AUTH_ERROR,
    (message) => {
      console.error("Auth error from native:", message.payload.error);
      // TODO: 사용자에게 에러 표시
    },
    []
  );
}
