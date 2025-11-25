/**
 * Login Screen Component
 *
 * Native login screen with Google OAuth
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";

interface LoginScreenProps {
  /**
   * Called when user taps Google login button
   */
  onGoogleLogin: () => void | Promise<void>;

  /**
   * Whether login is in progress
   */
  isLoading?: boolean;
}

/**
 * Login Screen Component
 *
 * Displays Google OAuth login button before showing WebView
 */
export function LoginScreen({ onGoogleLogin, isLoading = false }: LoginScreenProps) {
  return (
    <View style={styles.container}>
      {/* App Logo/Title */}
      <View style={styles.header}>
        <Text style={styles.title}>삼평오</Text>
        <Text style={styles.subtitle}>Sam-Pyeong-Oh</Text>
        <Text style={styles.description}>Google 계정으로 로그인하세요</Text>
      </View>

      {/* Google Login Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.buttonDisabled]}
          onPress={onGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonIcon}>G</Text>
              <Text style={styles.buttonText}>Google로 계속하기</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          계속 진행하면 서비스 약관 및{"\n"}개인정보 처리방침에 동의하는 것으로 간주됩니다
        </Text>
        <Text className="text-sm text-gray-500">Version 1.0.0</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: "#666",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 360,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 12,
    width: 24,
    textAlign: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
});

