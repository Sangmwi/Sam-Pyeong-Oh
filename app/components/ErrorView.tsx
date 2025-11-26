/**
 * Error View Component
 *
 * Displays user-friendly error messages with retry functionality
 */

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
    <View className="flex-1 justify-center items-center bg-gray-100 p-5">
      <Text className="text-2xl font-bold text-red-600 mb-4 text-center">웹뷰 연결 오류</Text>

      <Text className="text-base text-gray-800 mb-3 text-center leading-6">{error}</Text>

      {details && <Text className="text-sm text-gray-600 mb-3 text-center leading-5">{details}</Text>}

      {shouldShowDevChecklist && (
        <View className="bg-white rounded-lg p-4 my-4 w-full max-w-[500px] border-l-4 border-orange-500">
          <Text className="text-base font-semibold text-gray-800 mb-2">개발 환경 체크리스트</Text>
          <Text className="text-sm text-gray-600 leading-5 font-mono">{DEV_CHECKLIST_MESSAGE(webUrl)}</Text>
        </View>
      )}

      <TouchableOpacity className="bg-blue-500 py-3.5 px-8 rounded-lg mt-2" onPress={onRetry}>
        <Text className="text-white text-base font-semibold">다시 시도</Text>
      </TouchableOpacity>
    </View>
  );
}
