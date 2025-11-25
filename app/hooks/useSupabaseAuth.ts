/**
 * Supabase Authentication Hook
 *
 * Manages authentication with Supabase Auth and WebView synchronization
 */

import { useCallback, useEffect, type RefObject } from "react";
import { Alert } from "react-native";
import type { WebView } from "react-native-webview";
import {
  createAuthTokenMessage,
  createLogoutSuccessMessage,
  WebToNativeMessageType,
} from "@sam-pyeong-oh/shared";
import { SupabaseAuthService, type AuthResult } from "@app/services/auth/supabase-auth";
import { nativeMessageHub } from "@app/lib/native-message-hub";
import type { WebViewMessage } from "@app/types/webview";
import { useAuthStore } from "@app/stores/authStore";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  isSessionSynced: boolean; // New: Web sync status
}

/**
 * Supabase Auth Hook with WebView Integration
 */
export function useSupabaseAuth(webViewRef?: RefObject<WebView | null>) {
  const { 
    isAuthenticated, 
    isLoading, 
    userId, 
    email, 
    accessToken, 
    session,
    isSessionSynced,
    setLoading, 
    setSynced,
    setSession,
    logout: storeLogout 
  } = useAuthStore();

  // Send session helper
  const sendSessionToWebView = useCallback(
    (sessionToSync: AuthResult["session"]) => {
      if (!webViewRef?.current) return;

      const message = createAuthTokenMessage(
        sessionToSync.access_token,
        sessionToSync.user.id,
        sessionToSync.expires_at || Date.now() + 3600 * 1000,
        "google"
      );

      nativeMessageHub.sendMessageToRef(webViewRef || null, message);
    },
    [webViewRef]
  );

  // Sync session to WebView when access token changes
  useEffect(() => {
    if (session && webViewRef?.current) {
       sendSessionToWebView(session);
    }
  }, [session?.access_token, webViewRef, sendSessionToWebView]); // Use access_token as dependency to avoid unnecessary updates

  // Initialize bridge and handlers
  useEffect(() => {
    if (webViewRef) {
      nativeMessageHub.initialize(webViewRef);

      // Handle WEB_APP_READY message
      const readySubscription = nativeMessageHub.on(
        WebToNativeMessageType.WEB_APP_READY,
        async () => {
          // 현재 세션 가져오기 (fresh session preferred)
          const currentSession = await SupabaseAuthService.getSession();

          if (currentSession) {
            // 작은 딜레이 후 메시지 전송 (WebView injection 준비 시간)
            setTimeout(() => {
              sendSessionToWebView(currentSession);
            }, 100);
          }
        }
      );

      // Handle SESSION_SYNC_COMPLETE message
      const syncSubscription = nativeMessageHub.on(
        WebToNativeMessageType.SESSION_SYNC_COMPLETE,
        () => {
          setTimeout(() => {
            setSynced(true);
          }, 500); // UI Transition delay
        }
      );

      return () => {
        readySubscription();
        syncSubscription();
      };
    }
  }, [webViewRef, sendSessionToWebView, setSynced]);

  /**
   * Login with Google
   */
  const login = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const result = await SupabaseAuthService.signInWithGoogle();

      setSession(result.session);
      
      // Explicitly send to WebView if ref exists (optional as effect covers it, but good for immediate action)
      if (webViewRef?.current) {
        sendSessionToWebView(result.session);
      }
    } catch (error) {
      console.error("[useSupabaseAuth] Login failed:", error);
      setLoading(false);
      Alert.alert("오류", "로그인에 실패했습니다. 다시 시도해주세요.");
      throw error;
    }
  }, [sendSessionToWebView, setLoading, setSession, webViewRef]);

  /**
   * Logout
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      await SupabaseAuthService.signOut();

      storeLogout();

      if (webViewRef?.current) {
        const message = createLogoutSuccessMessage();
        nativeMessageHub.sendMessageToRef(webViewRef, message);
      }
    } catch (error) {
      console.error("[useSupabaseAuth] ❌ Logout failed:", error);
      setLoading(false);
      Alert.alert("오류", "로그아웃에 실패했습니다.");
      throw error;
    }
  }, [webViewRef, setLoading, storeLogout]);

  /**
   * Handle WebView messages
   */
  const handleWebViewMessage = useCallback((event: WebViewMessage) => {
    nativeMessageHub.handleMessage(event);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    userId,
    email,
    accessToken,
    isSessionSynced,
    login,
    logout,
    handleWebViewMessage,
  };
}
