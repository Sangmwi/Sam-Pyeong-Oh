"use client";

import { useEffect, useState } from "react";
import { useAuthMessage } from "@/hooks/useAuthMessage";
import { useAuthStore } from "@/store/auth";
import { messageBridge } from "@/lib/message-bridge";

export default function Home() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<string[]>([]);

  // 인증 관련 메시지 자동 처리
  useAuthMessage();

  // Debug: 로그 수집
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const message = args.map((arg) => String(arg)).join(" ");
      setLogs((prev) => [...prev.slice(-10), message]); // 최근 10개만
      originalLog.apply(console, args);
    };

    console.log("[Home] Component mounted");
    console.log("[Home] Token:", token ? token.substring(0, 20) + "..." : "NULL");

    // DEBUG: 강제 초기화
    messageBridge.initialize();
    console.log("[Home] messageBridge initialized");

    return () => {
      console.log = originalLog;
    };
  }, [token]);

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

        {/* Debug Logs */}
        <div className="rounded-lg border border-purple-300 bg-purple-50 p-4">
          <p className="mb-2 font-mono text-xs font-semibold text-purple-800">
            🐛 Debug Logs (최근 10개)
          </p>
          <div className="max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-purple-700">
            {logs.length === 0 ? (
              <p>로그 없음...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="truncate">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

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
