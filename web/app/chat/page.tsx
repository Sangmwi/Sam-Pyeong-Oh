"use client";

/**
 * Chat Page (WebView)
 *
 * 채팅 목록 및 대화 관리
 */

import { useAuthStore } from "@/store/auth";
import { useAuthMessage } from "@/hooks/useAuthMessage";

export default function ChatPage() {
  const { token } = useAuthStore();

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
          <h1 className="text-3xl font-bold">채팅</h1>
          <p className="mt-1 text-sm text-gray-600">대화 목록</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Empty State */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900">대화가 없습니다</h2>
          <p className="mt-2 text-sm text-gray-600">
            새로운 대화를 시작해보세요.
          </p>
          <button className="mt-6 rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 transition-colors">
            새 대화 시작
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex gap-2">
            <span className="text-blue-600">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">API 연동 예정</p>
              <p className="text-xs text-blue-600 mt-1">
                채팅 목록 조회, 대화 생성, 메시지 전송 등의 기능이 추가될 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
