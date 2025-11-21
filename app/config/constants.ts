/**
 * Application Constants
 *
 * Centralized configuration for the Expo app
 */

/**
 * OAuth providers supported by the app
 */
export const OAUTH_PROVIDERS = ["google"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/**
 * SecureStore keys for persistent storage
 */
export const SECURE_STORE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_ID: "user_id",
  PROVIDER: "auth_provider",
  EXPIRES_AT: "token_expires_at",
} as const;

/**
 * WebView configuration constants
 */
export const WEBVIEW_CONSTANTS = {
  /**
   * Timeout for WebView to load (ms)
   */
  LOAD_TIMEOUT: 30000,

  /**
   * Retry attempts for failed connections
   */
  MAX_RETRY_ATTEMPTS: 3,

  /**
   * Delay between retry attempts (ms)
   */
  RETRY_DELAY: 2000,
} as const;

/**
 * Error messages for user display
 */
export const ERROR_MESSAGES = {
  AUTH: {
    LOGIN_FAILED: "로그인에 실패했습니다. 다시 시도해주세요.",
    LOGOUT_FAILED: "로그아웃에 실패했습니다.",
    TOKEN_EXPIRED: "로그인이 만료되었습니다. 다시 로그인해주세요.",
    STORAGE_ERROR: "인증 정보 저장에 실패했습니다.",
  },
  WEBVIEW: {
    CONNECTION_FAILED: "웹 페이지에 연결할 수 없습니다.",
    LOAD_TIMEOUT: "페이지 로딩 시간이 초과되었습니다.",
    HTTP_ERROR: "서버 오류가 발생했습니다.",
    NETWORK_ERROR: "네트워크 연결을 확인해주세요.",
  },
  GENERAL: {
    UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다.",
    TRY_AGAIN: "다시 시도해주세요.",
  },
} as const;

/**
 * Success messages for user display
 */
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: "로그인에 성공했습니다!",
    LOGOUT_SUCCESS: "로그아웃되었습니다.",
  },
} as const;

/**
 * Development environment checklist message
 */
export const DEV_CHECKLIST_MESSAGE = (url: string) => `
개발 환경 체크리스트:
1. 웹 서버가 실행 중인지 확인 (web 디렉토리에서 'npm run dev')
2. Android 에뮬레이터: ${url}
3. 실제 기기: PC의 IP 주소 사용 필요 (예: http://192.168.x.x:3000)
4. 환경 변수 설정: EXPO_PUBLIC_WEB_URL=원하는URL
`.trim();
