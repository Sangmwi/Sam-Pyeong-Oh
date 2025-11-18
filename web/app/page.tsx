'use client';

import { useAuthStore } from '@/store/auth';
import { useAuthMessage } from '@/hooks/useAuthMessage';

export default function Home() {
  const { token } = useAuthStore();

  // 인증 관련 메시지 자동 처리
  useAuthMessage();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-4xl font-bold text-center">Sam-Pyeong-Oh</h1>
        <p className="text-center text-gray-600">삼평오 - AI Chat Application</p>

        {token ? (
          <div className="rounded-lg border border-green-500 bg-green-50 p-4">
            <p className="text-green-800 font-medium">✅ Authenticated</p>
            <p className="text-sm text-green-600 mt-1">Token received from native app</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
            <p className="text-gray-800 font-medium">🔒 Not Authenticated</p>
            <p className="text-sm text-gray-600 mt-1">Waiting for native OAuth...</p>
          </div>
        )}
      </div>
    </main>
  );
}
