/**
 * Supabase Authentication Hook
 *
 * Manages authentication with Supabase Auth and WebView synchronization
 */

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Alert } from "react-native";
import type { WebView } from "react-native-webview";
import { createAuthTokenMessage, createLogoutSuccessMessage, WebToNativeMessageType } from "@sam-pyeong-oh/shared";
import { SupabaseAuthService, type AuthResult } from "@app/services/auth/supabase-auth";
import { supabase } from "@app/lib/supabase";
import { webViewBridge } from "@app/utils/webview-bridge";
import type { WebViewMessage } from "@app/types/webview";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
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

      webViewBridge.sendMessageToRef(webViewRef || null, message);
      console.log("[useSupabaseAuth] Session sent to WebView");
    },
    [webViewRef]
  );

  // Initialize bridge and handlers
  useEffect(() => {
    if (webViewRef) {
      webViewBridge.initialize(webViewRef);

      // Handle WEB_APP_READY message
      // 중복 등록 방지를 위해 cleanup 먼저 호출 (선택사항, webViewBridge 내부 로직에 따라 다름)
      
      const cleanup = webViewBridge.on(WebToNativeMessageType.WEB_APP_READY, async () => {
        console.log("[useSupabaseAuth] ✅ Web App Ready signal received!");

        // 현재 세션 가져오기
        const session = await SupabaseAuthService.getSession();
        console.log("[useSupabaseAuth] Session exists:", !!session);

        if (session) {
          console.log("[useSupabaseAuth] 📤 Sending stored session to Web App");
          console.log("[useSupabaseAuth] User ID:", session.user.id);
          console.log("[useSupabaseAuth] Token (first 20 chars):", session.access_token.substring(0, 20));

          // 작은 딜레이 후 메시지 전송 (WebView injection 준비 시간)
          setTimeout(() => {
            // 직접 메시지 생성 및 전송 (sendSessionToWebView 의존성 제거)
            const message = createAuthTokenMessage(
              session.access_token,
              session.user.id,
              session.expires_at || Date.now() + 3600 * 1000,
              "google"
            );
            webViewBridge.sendMessageToRef(webViewRef || null, message);
            console.log("[useSupabaseAuth] ✅ AUTH_TOKEN message sent!");
          }, 100); // 100ms 딜레이
        } else {
          console.log("[useSupabaseAuth] ⚠️ No session found, user needs to login");
        }
      });

      return () => {
        cleanup();
      };
    }
  }, [webViewRef]); // 의존성 최소화

  /**
   * Restore session on mount
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await SupabaseAuthService.getSession();

        if (session) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            userId: session.user.id,
            email: session.user.email || null,
            accessToken: session.access_token,
          });

          // Send to WebView
          // 세션 객체를 그대로 전달 (AuthResult['session'] 형태에 맞춰 변환 필요 시 변환)
          sendSessionToWebView({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: {
              id: session.user.id,
              email: session.user.email,
              user_metadata: {
                name: session.user.user_metadata.full_name || session.user.user_metadata.name,
                avatar_url: session.user.user_metadata.avatar_url,
              },
            },
          });
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
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
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[useSupabaseAuth] Auth state changed:", _event);

      if (session) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          userId: session.user.id,
          email: session.user.email || null,
          accessToken: session.access_token,
        });

        // Send to WebView
        sendSessionToWebView({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: {
            id: session.user.id,
            email: session.user.email,
            user_metadata: {
              name: session.user.user_metadata.full_name || session.user.user_metadata.name,
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
        });
      }
    });

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
      });

      Alert.alert("성공", "로그아웃되었습니다.");

      // Send to WebView
      if (webViewRef) {
        const message = createLogoutSuccessMessage();
        webViewBridge.sendMessageToRef(webViewRef, message);
      }
    } catch (error) {
      console.error("[useSupabaseAuth] Logout failed:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      Alert.alert("오류", "로그아웃에 실패했습니다.");
      throw error;
    }
  }, [webViewRef]);

  /**
   * Handle WebView messages
   */
  const handleWebViewMessage = useCallback((event: WebViewMessage) => {
    webViewBridge.handleMessage(event);
  }, []);

  return {
    ...authState,
    login,
    logout,
    handleWebViewMessage,
  };
}
