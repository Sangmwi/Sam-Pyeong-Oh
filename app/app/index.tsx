/**
 * Root Screen - Authentication Gate
 *
 * 로그인 전: LoginScreen
 * 로그인 후: Tabs로 리다이렉트
 */

import React, { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@app/hooks/useAuth";
import { LoginScreen } from "@app/components/LoginScreen";

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const [loginInProgress, setLoginInProgress] = useState<boolean>(false);

  // Authentication hook
  const { isAuthenticated, isLoading, login } = useAuth();

  // Initialize WebBrowser for OAuth
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  // Auto-redirect to tabs when authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // 이미 탭 화면에 있지 않으면 리다이렉트
      const inTabs = segments[0] === "(tabs)";
      if (!inTabs) {
        router.replace("/(tabs)" as any);
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Google login handler
  const handleLogin = async () => {
    try {
      setLoginInProgress(true);
      await login("google");
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
