import React, { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import {
  createAuthTokenMessage,
  WebToNativeMessageType,
  type WebToNativeMessage,
} from "@sam-pyeong-oh/shared";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize WebBrowser
  React.useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  // Handle native OAuth (Google)
  const handleGoogleLogin = useCallback(async () => {
    try {
      // TODO: Implement actual Google OAuth
      const mockToken = "mock-jwt-token-" + Date.now();
      const mockUserId = "user_123";
      const mockExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

      await SecureStore.setItemAsync("auth_token", mockToken);
      await SecureStore.setItemAsync("user_id", mockUserId);

      const message = createAuthTokenMessage(mockToken, mockUserId, mockExpiresAt, "google");
      webViewRef.current?.postMessage(JSON.stringify(message));
      setIsAuthenticated(true);

      Alert.alert("Success", "Logged in with Google!");
    } catch (error) {
      console.error("Google login error:", error);
      Alert.alert("Error", "Failed to login with Google");
    }
  }, []);

  // Handle native OAuth (Kakao)
  const handleKakaoLogin = useCallback(async () => {
    try {
      // TODO: Implement actual Kakao OAuth
      const mockToken = "mock-jwt-token-kakao-" + Date.now();
      const mockUserId = "user_kakao_123";
      const mockExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

      await SecureStore.setItemAsync("auth_token", mockToken);
      await SecureStore.setItemAsync("user_id", mockUserId);

      const message = createAuthTokenMessage(mockToken, mockUserId, mockExpiresAt, "kakao");
      webViewRef.current?.postMessage(JSON.stringify(message));
      setIsAuthenticated(true);

      Alert.alert("Success", "Logged in with Kakao!");
    } catch (error) {
      console.error("Kakao login error:", error);
      Alert.alert("Error", "Failed to login with Kakao");
    }
  }, []);

  // Handle messages from WebView
  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const message: WebToNativeMessage = JSON.parse(event.nativeEvent.data);

        if (message.type === WebToNativeMessageType.REQUEST_LOGIN) {
          const { provider } = message.payload;
          if (provider === "google") {
            handleGoogleLogin();
          } else if (provider === "kakao") {
            handleKakaoLogin();
          }
        } else if (message.type === WebToNativeMessageType.REQUEST_LOGOUT) {
          SecureStore.deleteItemAsync("auth_token");
          SecureStore.deleteItemAsync("user_id");
          setIsAuthenticated(false);
          Alert.alert("Success", "Logged out successfully");
        }
      } catch (error) {
        console.error("Failed to parse WebView message:", error);
      }
    },
    [handleGoogleLogin, handleKakaoLogin]
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>삼평오</Text>
        <Text style={styles.subtitle}>Sam-Pyeong-Oh</Text>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Text style={styles.buttonText}>Login with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin}>
          <Text style={styles.buttonText}>Login with Kakao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.webViewContainer}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scalesPageToFit
      />
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
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 20,
    color: "#666",
    marginBottom: 40,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
    width: "80%",
    alignItems: "center",
  },
  kakaoButton: {
    backgroundColor: "#FEE500",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
