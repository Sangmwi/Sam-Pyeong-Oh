/**
 * 설정 탭 (Native)
 *
 * Native 기능:
 * - 로그아웃
 * - 알림 설정
 * - 앱 버전 정보
 * - 캐시 관리
 */

import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@app/hooks/useAuth";
import Constants from "expo-constants";

export default function SettingsTab() {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
        <Text style={styles.headerSubtitle}>앱 설정 및 계정 관리</Text>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>

        {user && (
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={48} color="#3b82f6" />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.email || "사용자"}</Text>
              <Text style={styles.userProvider}>Google 계정</Text>
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>

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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>법적 고지</Text>

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
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sam-Pyeong-Oh (삼평오)</Text>
        <Text style={styles.footerSubtext}>AI Chat Application</Text>
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
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons
          name={icon}
          size={24}
          color={destructive ? "#ef4444" : "#6b7280"}
          style={styles.settingIcon}
        />
        <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>{title}</Text>
      </View>

      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && showChevron && (
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.settingButton}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.settingButton}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  userProvider: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  settingButton: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: "#111827",
  },
  destructiveText: {
    color: "#ef4444",
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
    color: "#6b7280",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  footerSubtext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
});
