/**
 * useMessageHandler Hook
 *
 * 특정 메시지 타입에 대한 핸들러를 쉽게 등록
 */

import { useEffect } from "react";
import type { NativeToWebMessage } from "@sam-pyeong-oh/shared";
import { webMessageHub } from "@/lib/web-message-hub";

/**
 * 특정 메시지 타입에 핸들러 등록
 */
export function useMessageHandler<T extends NativeToWebMessage>(
  type: T["type"],
  handler: (message: T) => void | Promise<void>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const cleanup = webMessageHub.on(type, handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ...deps]);
}

/**
 * 모든 메시지에 대한 글로벌 핸들러 등록
 */
export function useGlobalMessageHandler(
  handler: (message: NativeToWebMessage) => void | Promise<void>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const cleanup = webMessageHub.onAll(handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
