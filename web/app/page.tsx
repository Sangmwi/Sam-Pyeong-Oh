"use client";

import { useEffect, useState } from "react";
import { useAuthMessage } from "@/hooks/useAuthMessage";
import { useAuthStore } from "@/store/auth";
import { webMessageHub } from "@/lib/web-message-hub";

export default function Home() {
  const { token } = useAuthStore();

  // 인증 관련 메시지 자동 처리
  useAuthMessage();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold">Sam-Pyeong-Oh</h1>
          <p className="text-gray-600">삼평오 - AI Chat Application</p>
        </div>

        {/* Auth Status */}
        {token ? (
          <div className="rounded-lg border border-green-500 bg-green-50 p-4">
            <p className="font-medium text-green-800">✅ Authenticated</p>
            <p className="mt-1 text-sm text-green-600">Token received from native app</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
            <p className="font-medium text-gray-800">🔒 Not Authenticated</p>
            <p className="mt-1 text-sm text-gray-600">Waiting for native OAuth...</p>
          </div>
        )}

        {/* Welcome Message */}
        {token && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              👋 환영합니다! 하단 탭에서 채팅과 프로필을 확인하세요.
            </p>
            <p className="mt-2 text-xs text-blue-600">
              로그아웃은 설정 탭에서 할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
