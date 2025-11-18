'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { messageBridge } from '@/lib/message-bridge';

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

  // 메시지 브리지 초기화 및 정리
  useEffect(() => {
    messageBridge.initialize();

    // 컴포넌트 언마운트 시 cleanup
    return () => {
      messageBridge.destroy();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
