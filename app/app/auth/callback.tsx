import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

/**
 * OAuth Callback Handler
 * 
 * 이 화면은 Deep Link로 앱이 열렸을 때 잠시 표시됩니다.
 * 실제 인증 로직은 useSupabaseAuth 및 index.tsx에서 처리되며,
 * 여기서는 단순히 사용자를 메인 화면으로 리다이렉트합니다.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // 잠시 대기 후 메인으로 이동 (인증 상태가 업데이트될 시간을 줌)
    const timer = setTimeout(() => {
      router.replace("/");
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
});

