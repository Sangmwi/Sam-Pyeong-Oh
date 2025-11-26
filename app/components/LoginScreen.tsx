/**
 * Login Screen Component
 *
 * Native login screen with Google OAuth
 */

import React from "react";
import { Text, TouchableOpacity, View, ActivityIndicator } from "react-native";

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
    <View className="flex-1 justify-center items-center bg-gray-100 p-5">
      {/* App Logo/Title */}
      <View className="items-center mb-16">
        <Text className="text-5xl font-bold text-gray-800 mb-2">삼평오</Text>
        <Text className="text-xl text-gray-600 mb-4">Sam-Pyeong-Oh</Text>
        <Text className="text-base text-gray-500 text-center">Google 계정으로 로그인하세요</Text>
      </View>

      {/* Google Login Button */}
      <View className="w-full max-w-[360px]">
        <TouchableOpacity
          className={`flex-row items-center justify-center bg-blue-500 py-4 px-6 rounded-lg shadow-md ${isLoading ? 'opacity-60' : ''}`}
          onPress={onGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text className="text-xl font-bold text-white mr-3 w-6 text-center">G</Text>
              <Text className="text-white text-base font-semibold">Google로 계속하기</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View className="absolute bottom-10 px-5">
        <Text className="text-xs text-gray-400 text-center leading-5">
          계속 진행하면 서비스 약관 및{"\n"}개인정보 처리방침에 동의하는 것으로 간주됩니다
        </Text>
        <Text className="text-sm text-gray-500 text-center mt-2">Version 1.0.0</Text>
      </View>
    </View>
  );
}
