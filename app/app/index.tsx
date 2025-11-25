/**
 * Root Screen - Authentication Gate
 *
 * 로그인 전: LoginScreen
 * 로그인 후: Tabs로 리다이렉트
 */

import React, { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useSupabaseAuth } from "@app/hooks/useSupabaseAuth";
import { LoginScreen } from "@app/components/LoginScreen";

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const [loginInProgress, setLoginInProgress] = useState<boolean>(false);

  // Supabase Authentication hook
  const { isAuthenticated, isLoading, login } = useSupabaseAuth();

  // Initialize WebBrowser for OAuth
  useEffect(() => {
    // Deep linking을 통한 OAuth 콜백 처리
    const handleDeepLink = async (event: { url: string }) => {
      // OAuth 콜백 URL인지 확인
      if (event.url.includes("auth/callback")) {
        WebBrowser.maybeCompleteAuthSession();
      }
    };

    // 초기 URL 확인 (앱이 리다이렉트로 열린 경우)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Deep linking 리스너 등록
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // WebBrowser 세션 완료 처리
    WebBrowser.maybeCompleteAuthSession();

    return () => {
      subscription.remove();
    };
  }, []);

  // Auto-redirect to tabs when authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const inTabs = segments[0] === "(tabs)";
      if (!inTabs) {
        router.replace("/(tabs)" as any);
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Google login handler (Supabase Auth)
  const handleLogin = async () => {
    try {
      setLoginInProgress(true);
      await login();
      // login 성공 시 위 useEffect에서 자동 리다이렉트
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setLoginInProgress(false);
    }
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onGoogleLogin={handleLogin} isLoading={loginInProgress} />;
  }

  // Show loading while redirecting
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
});
