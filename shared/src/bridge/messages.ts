/**
 * Message Bridge: Native ↔ Web Communication
 *
 * Type-safe message passing between Expo app and Next.js WebView
 */

// ============================================================================
// Message Types (Native → Web)
// ============================================================================

export enum NativeToWebMessageType {
  AUTH_TOKEN = "AUTH_TOKEN",
  AUTH_ERROR = "AUTH_ERROR",
  LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
}

export interface AuthTokenMessage {
  type: NativeToWebMessageType.AUTH_TOKEN;
  payload: {
    token: string;
    userId: string;
    expiresAt: number;
    provider: "google" | "kakao";
  };
}

export interface AuthErrorMessage {
  type: NativeToWebMessageType.AUTH_ERROR;
  payload: {
    error: string;
    provider?: "google" | "kakao";
  };
}

export interface LogoutSuccessMessage {
  type: NativeToWebMessageType.LOGOUT_SUCCESS;
  payload: Record<string, never>;
}

export type NativeToWebMessage = AuthTokenMessage | AuthErrorMessage | LogoutSuccessMessage;

// ============================================================================
// Message Types (Web → Native)
// ============================================================================

export enum WebToNativeMessageType {
  REQUEST_LOGIN = "REQUEST_LOGIN",
  REQUEST_LOGOUT = "REQUEST_LOGOUT",
  TOKEN_REFRESH_REQUEST = "TOKEN_REFRESH_REQUEST",
}

export interface RequestLoginMessage {
  type: WebToNativeMessageType.REQUEST_LOGIN;
  payload: {
    provider: "google" | "kakao";
  };
}

export interface RequestLogoutMessage {
  type: WebToNativeMessageType.REQUEST_LOGOUT;
  payload: Record<string, never>;
}

export interface TokenRefreshRequestMessage {
  type: WebToNativeMessageType.TOKEN_REFRESH_REQUEST;
  payload: Record<string, never>;
}

export type WebToNativeMessage =
  | RequestLoginMessage
  | RequestLogoutMessage
  | TokenRefreshRequestMessage;

// ============================================================================
// Type Guards
// ============================================================================

export function isNativeToWebMessage(data: unknown): data is NativeToWebMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as { type?: string };
  return Object.values(NativeToWebMessageType).includes(msg.type as NativeToWebMessageType);
}

export function isWebToNativeMessage(data: unknown): data is WebToNativeMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as { type?: string };
  return Object.values(WebToNativeMessageType).includes(msg.type as WebToNativeMessageType);
}

// ============================================================================
// Message Helpers
// ============================================================================

export function createAuthTokenMessage(
  token: string,
  userId: string,
  expiresAt: number,
  provider: "google" | "kakao"
): AuthTokenMessage {
  return {
    type: NativeToWebMessageType.AUTH_TOKEN,
    payload: { token, userId, expiresAt, provider },
  };
}

export function createRequestLoginMessage(provider: "google" | "kakao"): RequestLoginMessage {
  return {
    type: WebToNativeMessageType.REQUEST_LOGIN,
    payload: { provider },
  };
}

export function createRequestLogoutMessage(): RequestLogoutMessage {
  return {
    type: WebToNativeMessageType.REQUEST_LOGOUT,
    payload: {},
  };
}
