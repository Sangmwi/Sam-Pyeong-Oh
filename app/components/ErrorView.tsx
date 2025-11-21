/**
 * Error View Component
 *
 * Displays user-friendly error messages with retry functionality
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DEV_CHECKLIST_MESSAGE } from "@app/config/constants";
import { getWebUrl, isLocalUrl } from "@app/utils/url";

interface ErrorViewProps {
  /**
   * Error message to display
   */
  error: string;

  /**
   * Optional detailed error information
   */
  details?: string;

  /**
   * Callback when retry button is pressed
   */
  onRetry: () => void;

  /**
   * Whether to show development checklist
   */
  showDevChecklist?: boolean;
}

/**
 * Error View Component
 *
 * Displays errors with:
 * - Clear error title
 * - Error message
 * - Development checklist (for local URLs)
 * - Retry button
 */
export function ErrorView({ error, details, onRetry, showDevChecklist = true }: ErrorViewProps) {
  const webUrl = getWebUrl();
  const shouldShowDevChecklist = showDevChecklist && isLocalUrl(webUrl);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>웹뷰 연결 오류</Text>

      <Text style={styles.error}>{error}</Text>

      {details && <Text style={styles.details}>{details}</Text>}

      {shouldShowDevChecklist && (
        <View style={styles.checklistContainer}>
          <Text style={styles.checklistTitle}>개발 환경 체크리스트</Text>
          <Text style={styles.checklist}>{DEV_CHECKLIST_MESSAGE(webUrl)}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 16,
    textAlign: "center",
  },
  error: {
    fontSize: 16,
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  details: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 20,
  },
  checklistContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    width: "100%",
    maxWidth: 500,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  checklist: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    fontFamily: "monospace",
  },
  retryButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
