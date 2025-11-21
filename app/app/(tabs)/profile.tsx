/**
 * 프로필 탭 (WebView)
 *
 * API 중심 기능:
 * - 프로필 정보 편집
 * - 이미지 업로드
 * - 사용자 통계
 * - 활동 히스토리
 */

import { AppWebView } from "@app/components/AppWebView";

export default function ProfileTab() {
  return <AppWebView path="/profile" />;
}
