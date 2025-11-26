/**
 * 설정 탭 (Native)
 *
 * Native 기능:
 * - 로그아웃
 * - 알림 설정
 * - 앱 버전 정보
 * - 캐시 관리
 */

import { ScrollView, Text, TouchableOpacity, View, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSupabaseAuth } from "@app/hooks/useSupabaseAuth";
import Constants from "expo-constants";

export default function SettingsTab() {
  const router = useRouter();
  const { logout, email } = useSupabaseAuth();

  const handleLogout = async () => {
    Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            router.replace("/logout");
            await logout();
          } catch (error) {
            router.replace("/settings");
            console.error("[Settings] Logout failed:", error);
          }
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-16 pb-5 border-b border-gray-200">
        <Text className="text-3xl font-bold text-gray-900">설정</Text>
        <Text className="text-sm text-gray-500 mt-1">앱 설정 및 계정 관리</Text>
      </View>

      {/* Account Section */}
      <View className="mt-6 bg-white border-y border-gray-200">
        <Text className="text-xs font-semibold text-gray-500 uppercase px-5 pt-4 pb-2">계정</Text>

        {email && (
          <View className="flex-row items-center px-5 py-4 border-b border-gray-200">
            <Ionicons name="person-circle" size={48} color="#3b82f6" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-gray-900">{email}</Text>
              <Text className="text-sm text-gray-500 mt-0.5">Google 계정</Text>
            </View>
          </View>
        )}

        <SettingItem
          icon="log-out"
          title="로그아웃"
          onPress={handleLogout}
          destructive
          showChevron={false}
        />
      </View>

      {/* App Section */}
      <View className="mt-6 bg-white border-y border-gray-200">
        <Text className="text-xs font-semibold text-gray-500 uppercase px-5 pt-4 pb-2">앱 정보</Text>

        <SettingItem icon="information-circle" title="버전" value={appVersion} />

        <SettingItem
          icon="notifications"
          title="알림 설정"
          onPress={() => Alert.alert("준비 중", "알림 설정 기능은 준비 중입니다.")}
        />

        <SettingItem
          icon="trash"
          title="캐시 삭제"
          onPress={() => Alert.alert("준비 중", "캐시 삭제 기능은 준비 중입니다.")}
        />
      </View>

      {/* Legal Section */}
      <View className="mt-6 bg-white border-y border-gray-200">
        <Text className="text-xs font-semibold text-gray-500 uppercase px-5 pt-4 pb-2">법적 고지</Text>

        <SettingItem
          icon="document-text"
          title="이용약관"
          onPress={() => Alert.alert("준비 중", "이용약관은 준비 중입니다.")}
        />

        <SettingItem
          icon="shield"
          title="개인정보처리방침"
          onPress={() => Alert.alert("준비 중", "개인정보처리방침은 준비 중입니다.")}
        />
      </View>

      {/* Footer */}
      <View className="items-center py-8">
        <Text className="text-sm font-semibold text-gray-500">Sam-Pyeong-Oh (삼평오)</Text>
        <Text className="text-xs text-gray-400 mt-1">AI Chat Application</Text>
      </View>
    </ScrollView>
  );
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

function SettingItem({
  icon,
  title,
  value,
  onPress,
  destructive = false,
  showChevron = true,
}: SettingItemProps) {
  const content = (
    <View className="flex-row items-center justify-between px-5 py-4">
      <View className="flex-row items-center flex-1">
        <Ionicons
          name={icon}
          size={24}
          color={destructive ? "#ef4444" : "#6b7280"}
          style={{ marginRight: 12 }}
        />
        <Text className={`text-base ${destructive ? 'text-red-500' : 'text-gray-900'}`}>{title}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {value && <Text className="text-base text-gray-500">{value}</Text>}
        {onPress && showChevron && (
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} className="border-b border-gray-200">
        {content}
      </TouchableOpacity>
    );
  }

  return <View className="border-b border-gray-200">{content}</View>;
}
