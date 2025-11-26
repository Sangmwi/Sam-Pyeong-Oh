/**
 * Logout Screen
 * 
 * 로그아웃 후 잠시 대기하는 화면입니다.
 * useAuthListener가 세션을 복구하지 못하도록 시간을 벌어줍니다.
 */
import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@app/stores/authStore";

export default function LogoutScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // 잠시 대기 후 루트로 이동
    const timer = setTimeout(() => {
      router.replace("/");
    }, 500); // 500ms 대기

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text className="mt-4 text-base text-gray-500">로그아웃 중...</Text>
    </View>
  );
}
