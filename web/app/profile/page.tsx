"use client";

/**
 * Profile Page (WebView)
 *
 * API 중심 기능:
 * - 프로필 정보 조회/편집
 * - 이미지 업로드
 * - 사용자 통계
 * - 활동 히스토리
 */

import { useAuthStore } from "@/store/auth";
import { useAuthMessage } from "@/hooks/useAuthMessage";

export default function ProfilePage() {
  const { token, userId, provider } = useAuthStore();

  // 인증 관련 메시지 자동 처리
  useAuthMessage();

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">🔒 인증 필요</h1>
          <p className="mt-2 text-gray-600">로그인이 필요한 페이지입니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <h1 className="text-3xl font-bold">프로필</h1>
          <p className="mt-1 text-sm text-gray-600">내 정보 및 활동</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            {/* Avatar Placeholder */}
            <div className="h-20 w-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
              👤
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold">사용자</h2>
              <p className="text-sm text-gray-600">Google 계정</p>
              <p className="mt-1 text-xs text-gray-500">ID: {userId}</p>
            </div>
          </div>

          {/* Edit Button */}
          <button className="mt-4 w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
            프로필 편집
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">활동 통계</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">대화</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">메시지</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">일</div>
            </div>
          </div>
        </div>

        {/* Activity Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">최근 활동</h3>

          <div className="text-center py-8 text-gray-500">
            <p>아직 활동 내역이 없습니다.</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex gap-2">
            <span className="text-blue-600">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">API 연동 예정</p>
              <p className="text-xs text-blue-600 mt-1">
                프로필 편집, 이미지 업로드, 통계 조회 등의 기능이 추가될 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
