/**
 * Supabase Authentication Hook
 *
 * Manages authentication with Supabase Auth and WebView synchronization
 */

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Alert } from "react-native";
import type { WebView } from "react-native-webview";
import {
  createAuthTokenMessage,
  createLogoutSuccessMessage,
  WebToNativeMessageType,
} from "@sam-pyeong-oh/shared";
import { SupabaseAuthService, type AuthResult } from "@app/services/auth/supabase-auth";
import { supabase } from "@app/lib/supabase";
import { nativeMessageHub } from "@app/lib/native-message-hub";
import type { WebViewMessage } from "@app/types/webview";

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
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    email: null,
    accessToken: null,
    isSessionSynced: false,
  });

  // Send session helper
  const sendSessionToWebView = useCallback(
    (session: AuthResult["session"]) => {
      if (!webViewRef?.current) return;

      const message = createAuthTokenMessage(
        session.access_token,
        session.user.id,
        session.expires_at || Date.now() + 3600 * 1000,
        "google"
      );

      nativeMessageHub.sendMessageToRef(webViewRef || null, message);
    },
    [webViewRef]
  );

  // Initialize bridge and handlers
  useEffect(() => {
    if (webViewRef) {
      nativeMessageHub.initialize(webViewRef);

      // Handle WEB_APP_READY message
      const readySubscription = nativeMessageHub.on(
        WebToNativeMessageType.WEB_APP_READY,
        async () => {
          // 현재 세션 가져오기
          const session = await SupabaseAuthService.getSession();

          if (session) {
            // 작은 딜레이 후 메시지 전송 (WebView injection 준비 시간)
            setTimeout(() => {
              const message = createAuthTokenMessage(
                session.access_token,
                session.user.id,
                session.expires_at || Date.now() + 3600 * 1000,
                "google"
              );
              nativeMessageHub.sendMessageToRef(webViewRef || null, message);
            }, 100);
          }
        }
      );

      // Handle SESSION_SYNC_COMPLETE message
      const syncSubscription = nativeMessageHub.on(
        WebToNativeMessageType.SESSION_SYNC_COMPLETE,
        () => {
          setTimeout(() => {
            setAuthState((prev) => ({ ...prev, isSessionSynced: true }));
          }, 500); // UI Transition delay
        }
      );

      return () => {
        readySubscription();
        syncSubscription();
      };
    }
  }, [webViewRef]);

  /**
   * Restore session on mount
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await SupabaseAuthService.getSession();

        if (session) {
          setAuthState((prev) => ({
            ...prev,
            isAuthenticated: true,
            isLoading: false,
            userId: session.user.id,
            email: session.user.email || null,
            accessToken: session.access_token,
            // Don't set synced yet, wait for WebView handshake
          }));

          // Send to WebView
          sendSessionToWebView({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: {
              id: session.user.id,
              email: session.user.email,
              user_metadata: {
                name:
                  session.user.user_metadata.full_name ||
                  session.user.user_metadata.name,
                avatar_url: session.user.user_metadata.avatar_url,
              },
            },
          });
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false, isSessionSynced: true })); // No session to sync
        }
      } catch (error) {
        console.error("[useSupabaseAuth] Session restore failed:", error);
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    restoreSession();
  }, [sendSessionToWebView]);

  /**
   * Listen to auth state changes
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setAuthState((prev) => ({
            ...prev,
            isAuthenticated: true,
            isLoading: false,
            userId: session.user.id,
            email: session.user.email || null,
            accessToken: session.access_token,
            isSessionSynced: false, // Reset sync on new session
          }));

          // Send to WebView
          sendSessionToWebView({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: {
              id: session.user.id,
              email: session.user.email,
              user_metadata: {
                name:
                  session.user.user_metadata.full_name ||
                  session.user.user_metadata.name,
                avatar_url: session.user.user_metadata.avatar_url,
              },
            },
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            userId: null,
            email: null,
            accessToken: null,
            isSessionSynced: true, // No session needed
          });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [sendSessionToWebView]);

  /**
   * Login with Google
   */
  const login = useCallback(async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const result = await SupabaseAuthService.signInWithGoogle();

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        userId: result.session.user.id,
        email: result.session.user.email || null,
        accessToken: result.session.access_token,
        isSessionSynced: false, // Start sync
      });

      Alert.alert("성공", "로그인에 성공했습니다!");

      // Send to WebView
      sendSessionToWebView(result.session);
    } catch (error) {
      console.error("[useSupabaseAuth] Login failed:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      Alert.alert("오류", "로그인에 실패했습니다. 다시 시도해주세요.");
      throw error;
    }
  }, [sendSessionToWebView]);

  /**
   * Logout
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      await SupabaseAuthService.signOut();

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        email: null,
        accessToken: null,
        isSessionSynced: true,
      });

      Alert.alert("성공", "로그아웃되었습니다.");

      if (webViewRef) {
        const message = createLogoutSuccessMessage();
        nativeMessageHub.sendMessageToRef(webViewRef, message);
      }
    } catch (error) {
      console.error("[useSupabaseAuth] ❌ Logout failed:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      Alert.alert("오류", "로그아웃에 실패했습니다.");
      throw error;
    }
  }, [webViewRef]);

  /**
   * Handle WebView messages
   */
  const handleWebViewMessage = useCallback((event: WebViewMessage) => {
    nativeMessageHub.handleMessage(event);
  }, []);

  return {
    ...authState,
    login,
    logout,
    handleWebViewMessage,
  };
}
