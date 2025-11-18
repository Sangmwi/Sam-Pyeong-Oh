"use client";

import { useAuthMessage } from "@/hooks/useAuthMessage";
import { useAuthStore } from "@/store/auth";

export default function Home() {
  const { token } = useAuthStore();

  // 인증 관련 메시지 자동 처리
  useAuthMessage();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-center text-4xl font-bold">Sam-Pyeong-Oh</h1>
        <p className="text-center text-gray-600">삼평오 - AI Chat Application</p>

        {token ? (
          <div className="rounded-lg border border-green-500 bg-green-50 p-4">
            <p className="font-medium text-green-800">✅ Authenticated</p>
            <p className="mt-1 text-sm text-green-600">Token received from native app</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-300 bg-gray-400 p-4">
            <p className="font-medium text-gray-800">🔒 Not Authenticated</p>
            <p className="mt-1 text-sm text-gray-600">Waiting for native OAuth...</p>
          </div>
        )}
      </div>
    </main>
  );
}
