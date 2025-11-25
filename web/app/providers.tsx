"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { webMessageHub } from "@/lib/web-message-hub";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // 메시지 허브 초기화 및 정리
  useEffect(() => {
    webMessageHub.initialize();

    // 컴포넌트 언마운트 시 cleanup
    return () => {
      webMessageHub.destroy();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
