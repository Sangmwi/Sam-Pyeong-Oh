/**
 * Authentication Hook (with WebView Bridge Integration)
 *
 * Manages authentication state, OAuth operations, and WebView synchronization.
 * Automatically sends auth state changes to WebView.
 */

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Alert } from "react-native";
import type { WebView } from "react-native-webview";
import {
  createAuthTokenMessage,
  createAuthErrorMessage,
  createLogoutSuccessMessage,
  WebToNativeMessageType,
} from "@sam-pyeong-oh/shared";
import { OAuthService, type OAuthResult } from "@app/services/oauth";
import { useSecureStorage, type StoredAuthData } from "./useSecureStorage";
import { webViewBridge } from "@app/utils/webview-bridge";
import type { OAuthProvider } from "@app/config/constants";
import type { WebViewMessage } from "@app/types/webview";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@app/config/constants";

/**
 * Authentication state
 */
export interface AuthState {
  /**
   * Whether user is authenticated
   */
  isAuthenticated: boolean;

  /**
   * Whether authentication status is being loaded
   */
  isLoading: boolean;

  /**
   * Current user ID (if authenticated)
   */
  userId: string | null;

  /**
   * Current OAuth provider (if authenticated)
   */
  provider: OAuthProvider | null;

  /**
   * Authentication token (if authenticated)
   */
  token: string | null;
}

/**
 * Authentication hook with WebView integration
 *
 * @param webViewRef - Optional WebView reference for automatic synchronization
 *
 * Features:
 * - Login with OAuth providers
 * - Logout
 * - Auto-restore authentication from SecureStore
 * - Token expiration checking
 * - Automatic WebView synchronization (if webViewRef provided)
 * - WebView message handling
 */
export function useAuth(webViewRef?: RefObject<WebView | null>) {
  const { saveAuth, getAuth, clearAuth, isTokenExpired } = useSecureStorage();

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    provider: null,
    token: null,
  });

  // Initialize bridge with WebView ref
  useEffect(() => {
    if (webViewRef) {
      webViewBridge.initialize(webViewRef);
    }
  }, [webViewRef]);

  /**
   * Restore authentication from SecureStore on mount
   */
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const storedAuth = await getAuth();

        if (!storedAuth) {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Check if token is expired
        const expired = await isTokenExpired();
        if (expired) {
          console.log("Stored token is expired, clearing auth");
          await clearAuth();
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Restore authentication state
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          userId: storedAuth.userId,
          provider: storedAuth.provider,
          token: storedAuth.token,
        });

        console.log(`Auth restored for user: ${storedAuth.userId}`);

        // Send to WebView if available
        if (webViewRef) {
          const message = createAuthTokenMessage(
            storedAuth.token,
            storedAuth.userId,
            storedAuth.expiresAt,
            storedAuth.provider
          );
          webViewBridge.sendMessage(message);
        }
      } catch (error) {
        console.error("Failed to restore auth:", error);
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    restoreAuth();
  }, [getAuth, clearAuth, isTokenExpired, webViewRef]);

  /**
   * Login with OAuth provider
   */
  const login = useCallback(
    async (provider: OAuthProvider): Promise<OAuthResult> => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true }));

        // Execute OAuth flow
        const result = await OAuthService.login(provider);

        // Store authentication data
        const authData: StoredAuthData = {
          token: result.token,
          userId: result.userId,
          provider: result.provider,
          expiresAt: result.expiresAt,
        };

        await saveAuth(authData);

        // Update state
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          userId: result.userId,
          provider: result.provider,
          token: result.token,
        });

        Alert.alert("성공", SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS);

        // Send to WebView if available
        if (webViewRef) {
          const message = createAuthTokenMessage(
            result.token,
            result.userId,
            result.expiresAt,
            result.provider
          );
          webViewBridge.sendMessage(message);
        }

        return result;
      } catch (error) {
        console.error(`Login failed for provider ${provider}:`, error);

        setAuthState((prev) => ({ ...prev, isLoading: false }));

        Alert.alert("오류", ERROR_MESSAGES.AUTH.LOGIN_FAILED);

        // Send error to WebView if available
        if (webViewRef) {
          const message = createAuthErrorMessage(ERROR_MESSAGES.AUTH.LOGIN_FAILED, provider);
          webViewBridge.sendMessage(message);
        }

        throw error;
      }
    },
    [saveAuth, webViewRef]
  );

  /**
   * Logout and clear authentication data
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Clear stored authentication
      await clearAuth();

      // Reset state
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        provider: null,
        token: null,
      });

      Alert.alert("성공", SUCCESS_MESSAGES.AUTH.LOGOUT_SUCCESS);

      // Send to WebView if available
      if (webViewRef) {
        const message = createLogoutSuccessMessage();
        webViewBridge.sendMessage(message);
      }
    } catch (error) {
      console.error("Logout failed:", error);

      setAuthState((prev) => ({ ...prev, isLoading: false }));

      Alert.alert("오류", ERROR_MESSAGES.AUTH.LOGOUT_FAILED);

      throw error;
    }
  }, [clearAuth, webViewRef]);

  /**
   * Check if current token is expired
   */
  const checkTokenExpiration = useCallback(async (): Promise<boolean> => {
    if (!authState.isAuthenticated) {
      return true;
    }

    const expired = await isTokenExpired();

    if (expired) {
      console.log("Token expired, logging out");
      await logout();
    }

    return expired;
  }, [authState.isAuthenticated, isTokenExpired, logout]);

  /**
   * Handle incoming WebView message
   *
   * Automatically handles auth-related messages from WebView
   */
  const handleWebViewMessage = useCallback(
    (event: WebViewMessage) => {
      webViewBridge.handleMessage(event);
    },
    []
  );

  // Register message handlers
  useEffect(() => {
    const cleanup1 = webViewBridge.on(WebToNativeMessageType.REQUEST_LOGIN, (message) => {
      if (message.type === WebToNativeMessageType.REQUEST_LOGIN) {
        const { provider } = message.payload;
        login(provider).catch((error) => {
          console.error("Login request from WebView failed:", error);
        });
      }
    });

    const cleanup2 = webViewBridge.on(WebToNativeMessageType.REQUEST_LOGOUT, () => {
      logout().catch((error) => {
        console.error("Logout request from WebView failed:", error);
      });
    });

    const cleanup3 = webViewBridge.on(WebToNativeMessageType.TOKEN_REFRESH_REQUEST, () => {
      // TODO: Implement token refresh logic
      console.warn("Token refresh not yet implemented");
    });

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
    };
  }, [login, logout]);

  return {
    // State
    ...authState,

    // Operations
    login,
    logout,
    checkTokenExpiration,

    // WebView integration
    handleWebViewMessage,
  };
}
