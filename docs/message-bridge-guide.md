# 메시지 브리지 시스템 사용 가이드

## 📌 개요

메시지 브리지는 **네이티브 앱(Expo)과 웹(Next.js) 간의 양방향 통신**을 위한 시스템입니다.

### 왜 필요한가?

Expo WebView 안에서 Next.js가 실행되므로, 네이티브 기능(OAuth, SecureStore 등)의 결과를 웹으로 전달해야 합니다.

### 기존 방식의 문제점

```typescript
// ❌ 나쁜 방식: 컴포넌트마다 이벤트 리스너 등록
useEffect(() => {
  const handler = (event: MessageEvent) => {
    const message = JSON.parse(event.data);
    if (message.type === "AUTH_TOKEN") {
      setAuth(message.payload);
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, []);
```

**문제점:**

- 메시지 타입이 늘어날 때마다 모든 컴포넌트를 수정해야 함
- 타입 안정성이 보장되지 않음
- 메모리 누수 위험 (cleanup 누락 시)
- 코드 중복이 심함

---

## 🏗️ 새로운 구조

### 1. 메시지 브리지 (Singleton)

**파일**: `web/lib/message-bridge.ts`

```typescript
class MessageBridge {
  private handlers: Map<타입, Set<핸들러함수들>>;

  // 특정 타입의 메시지를 처리할 핸들러 등록
  on(type, handler) { ... }

  // 모든 메시지를 처리할 글로벌 핸들러
  onAll(handler) { ... }

  // window.message 이벤트 리스너 초기화 (한 번만)
  initialize() { ... }
}

export const messageBridge = new MessageBridge();
```

**핵심 아이디어:**

- **전역에서 단 한 번만** `window.addEventListener('message')` 실행
- 메시지 타입별로 핸들러를 **등록/해제** 가능
- 타입 안정성 보장

---

### 2. useMessageHandler 훅

**파일**: `web/hooks/useMessageHandler.ts`

```typescript
export function useMessageHandler<T extends NativeToWebMessage>(
  type: T["type"], // 어떤 메시지 타입?
  handler: (message: T) => void, // 처리 함수
  deps: React.DependencyList = [] // 의존성 배열
) {
  useEffect(() => {
    const cleanup = messageBridge.on(type, handler);
    return cleanup; // 컴포넌트 언마운트 시 자동 해제
  }, [type, ...deps]);
}
```

**사용 예시:**

```typescript
import { useMessageHandler } from '@/hooks/useMessageHandler';
import { NativeToWebMessageType } from '@sam-pyeong-oh/shared';

function MyComponent() {
  // AUTH_TOKEN 메시지 처리
  useMessageHandler(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      console.log('토큰 받음:', message.payload.token);
      // 여기서 상태 업데이트, API 호출 등
    },
    [] // 의존성 배열 (빈 배열 = 한 번만 등록)
  );

  return <div>...</div>;
}
```

---

### 3. useAuthMessage 훅 (인증 도메인 통합)

**파일**: `web/hooks/useAuthMessage.ts`

인증 관련 메시지를 **하나의 훅으로 통합**:

```typescript
export function useAuthMessage() {
  const { setAuth, clearAuth } = useAuthStore();

  // AUTH_TOKEN 처리
  useMessageHandler(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      const { token, userId, expiresAt, provider } = message.payload;
      setAuth({ token, userId, expiresAt, provider });
    },
    [setAuth]
  );

  // LOGOUT_SUCCESS 처리
  useMessageHandler(
    NativeToWebMessageType.LOGOUT_SUCCESS,
    () => {
      clearAuth();
    },
    [clearAuth]
  );

  // AUTH_ERROR 처리
  useMessageHandler(
    NativeToWebMessageType.AUTH_ERROR,
    (message) => {
      console.error("Auth error from native:", message.payload.error);
      // TODO: 사용자에게 에러 표시
    },
    []
  );
}
```

**사용법 (컴포넌트에서):**

```typescript
// app/page.tsx
export default function Home() {
  useAuthMessage(); // 이 한 줄이면 끝!

  return <main>...</main>;
}
```

---

## 🚀 실전 사용법

### 초기 설정 (한 번만)

**파일**: `web/app/providers.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { messageBridge } from '@/lib/message-bridge';

export function Providers({ children }: { children: React.ReactNode }) {
  // 메시지 브리지 초기화 (전역 한 번만)
  useEffect(() => {
    messageBridge.initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**파일**: `web/app/layout.tsx`

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### 새로운 메시지 타입 추가하기

#### Step 1: shared 패키지에 타입 정의

**파일**: `shared/src/bridge/messages.ts`

```typescript
// 1. 메시지 타입 enum에 추가
export enum NativeToWebMessageType {
  AUTH_TOKEN = "AUTH_TOKEN",
  LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
  AUTH_ERROR = "AUTH_ERROR",
  PROFILE_UPDATED = "PROFILE_UPDATED", // 👈 새로 추가
}

// 2. 메시지 인터페이스 정의
export interface ProfileUpdatedMessage {
  type: NativeToWebMessageType.PROFILE_UPDATED;
  payload: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// 3. Union 타입에 추가
export type NativeToWebMessage =
  | AuthTokenMessage
  | LogoutSuccessMessage
  | AuthErrorMessage
  | ProfileUpdatedMessage; // 👈 여기도 추가
```

#### Step 2: 웹에서 핸들러 추가

**방법 A: 기존 훅에 추가**

```typescript
// web/hooks/useAuthMessage.ts
export function useAuthMessage() {
  const { setAuth, clearAuth } = useAuthStore();
  const { updateProfile } = useProfileStore(); // 👈 새로운 store

  // ... 기존 핸들러들 ...

  // 새로운 핸들러 추가
  useMessageHandler(
    NativeToWebMessageType.PROFILE_UPDATED,
    (message) => {
      updateProfile(message.payload);
    },
    [updateProfile]
  );
}
```

**방법 B: 별도의 도메인 훅 생성**

```typescript
// web/hooks/useProfileMessage.ts
import { NativeToWebMessageType } from "@sam-pyeong-oh/shared";
import { useProfileStore } from "@/store/profile";
import { useMessageHandler } from "./useMessageHandler";

export function useProfileMessage() {
  const { updateProfile } = useProfileStore();

  useMessageHandler(
    NativeToWebMessageType.PROFILE_UPDATED,
    (message) => {
      updateProfile(message.payload);
    },
    [updateProfile]
  );
}
```

#### Step 3: 컴포넌트에서 사용

```typescript
// app/profile/page.tsx
export default function ProfilePage() {
  useProfileMessage(); // 프로필 메시지 처리

  return <div>...</div>;
}
```

---

## 🎯 패턴 및 Best Practices

### 1. 도메인별로 훅 분리

```typescript
useAuthMessage(); // 인증 관련
useProfileMessage(); // 프로필 관련
usePaymentMessage(); // 결제 관련
useChatMessage(); // 채팅 관련
```

### 2. 글로벌 메시지 처리

모든 메시지를 로깅하거나 분석할 때:

```typescript
// web/hooks/useGlobalMessageHandler.ts
import { useGlobalMessageHandler } from "./useMessageHandler";

export function useMessageLogger() {
  useGlobalMessageHandler((message) => {
    console.log("[Native→Web]", message.type, message.payload);
    // 분석 도구로 전송 등
  }, []);
}
```

### 3. 의존성 배열 관리

```typescript
// ❌ 나쁜 예: 의존성 누락
useMessageHandler(
  NativeToWebMessageType.AUTH_TOKEN,
  (message) => {
    setAuth(message.payload); // setAuth가 바뀌면 문제 발생
  },
  [] // 의존성 배열에 setAuth가 없음!
);

// ✅ 좋은 예: 의존성 명시
useMessageHandler(
  NativeToWebMessageType.AUTH_TOKEN,
  (message) => {
    setAuth(message.payload);
  },
  [setAuth] // setAuth가 바뀌면 핸들러 재등록
);
```

### 4. 에러 처리

```typescript
useMessageHandler(
  NativeToWebMessageType.AUTH_TOKEN,
  async (message) => {
    try {
      // API 호출 등 비동기 작업
      await validateToken(message.payload.token);
      setAuth(message.payload);
    } catch (error) {
      console.error("Token validation failed:", error);
      // 사용자에게 에러 표시
      toast.error("로그인에 실패했습니다.");
    }
  },
  [setAuth]
);
```

---

## 🔍 디버깅

### 메시지 전송 테스트

개발자 도구 콘솔에서:

```javascript
// 네이티브에서 웹으로 메시지 보내는 시뮬레이션
window.postMessage(
  JSON.stringify({
    type: "AUTH_TOKEN",
    payload: {
      token: "test-token-123",
      userId: "user-456",
      expiresAt: Date.now() + 3600000,
      provider: "google",
    },
  }),
  "*"
);
```

### 메시지 로깅

```typescript
// web/app/providers.tsx
useEffect(() => {
  messageBridge.initialize();

  // 개발 환경에서만 로깅
  if (process.env.NODE_ENV === "development") {
    messageBridge.onAll((message) => {
      console.log("[MessageBridge]", message);
    });
  }
}, []);
```

---

## 📊 구조 비교

### 기존 방식

```
컴포넌트A → addEventListener → 메시지 파싱 → 처리
컴포넌트B → addEventListener → 메시지 파싱 → 처리
컴포넌트C → addEventListener → 메시지 파싱 → 처리
```

- 이벤트 리스너 3개
- 코드 중복 심함
- 타입 안정성 없음

### 새로운 방식

```
MessageBridge → addEventListener (1개만!)
  ├─ AUTH_TOKEN → useAuthMessage
  ├─ LOGOUT_SUCCESS → useAuthMessage
  └─ PROFILE_UPDATED → useProfileMessage
```

- 이벤트 리스너 1개
- 핸들러만 추가하면 됨
- 완전한 타입 안정성

---

## ✅ 체크리스트

새로운 메시지 타입 추가 시:

- [ ] `shared/src/bridge/messages.ts`에 enum 추가
- [ ] 메시지 인터페이스 정의
- [ ] `NativeToWebMessage` union 타입에 추가
- [ ] 웹에서 `useMessageHandler`로 핸들러 등록
- [ ] 네이티브에서 메시지 전송 구현
- [ ] 개발자 도구로 테스트

---

## 💡 요약

1. **MessageBridge**: 전역 싱글톤, 한 번만 initialize
2. **useMessageHandler**: 타입별 핸들러 등록
3. **useAuthMessage**: 인증 도메인 훅 (다른 도메인도 동일 패턴)
4. **확장성**: 새로운 타입 추가는 3단계만 (타입 정의 → 핸들러 추가 → 사용)

이제 메시지가 100개가 되어도 걱정 없습니다! 🚀
