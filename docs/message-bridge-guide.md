# Message Bridge System Guide

**Sam-Pyeong-Oh 프로젝트의 Native ↔ Web 양방향 통신 시스템**

---

## 📌 목차

1. [개요](#-개요)
2. [아키텍처](#-아키텍처)
3. [Web Side 사용법](#-web-side-nextjs)
4. [App Side 사용법](#-app-side-expo)
5. [메시지 타입 추가하기](#-새로운-메시지-타입-추가하기)
6. [실전 예제](#-실전-예제)
7. [디버깅](#-디버깅)
8. [Best Practices](#-best-practices)

---

## 📌 개요

### 왜 필요한가?

Sam-Pyeong-Oh는 **Expo 앱 안에서 Next.js WebView**를 실행하는 하이브리드 구조입니다.

```
┌─────────────────────────┐
│   Expo Native App       │
│  ┌───────────────────┐  │
│  │  Next.js WebView  │  │  ← 여기서 통신 필요!
│  │                   │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**통신이 필요한 이유**:
- 🔐 Native OAuth → Web에 토큰 전달
- 🔒 Native SecureStore → Web 상태 동기화
- 📤 Web → Native 로그아웃 요청
- 🔄 실시간 양방향 데이터 교환

### 통일된 구조

**Web과 App 모두 동일한 클래스 기반 패턴 사용**:
- ✅ 일관된 API
- ✅ 타입 안전성
- ✅ 확장 가능
- ✅ 자동 cleanup

---

## 🏗️ 아키텍처

### 메시지 방향

```
┌──────────────┐                    ┌──────────────┐
│  Native App  │                    │  Next.js Web │
│   (Expo)     │                    │   (WebView)  │
└──────────────┘                    └──────────────┘
       │                                    │
       │  NativeToWebMessage                │
       │  ─────────────────────────────>    │
       │  (AUTH_TOKEN, LOGOUT_SUCCESS)      │
       │                                    │
       │  WebToNativeMessage                │
       │  <─────────────────────────────    │
       │  (REQUEST_LOGIN, REQUEST_LOGOUT)   │
       │                                    │
```

### 메시지 타입

#### Native → Web (`NativeToWebMessage`)

| 타입 | 설명 | Payload |
|------|------|---------|
| `AUTH_TOKEN` | 로그인 성공 시 토큰 전달 | `{ token, userId, expiresAt, provider }` |
| `AUTH_ERROR` | 로그인 실패 | `{ error, provider? }` |
| `LOGOUT_SUCCESS` | 로그아웃 완료 | `{}` |

#### Web → Native (`WebToNativeMessage`)

| 타입 | 설명 | Payload |
|------|------|---------|
| `REQUEST_LOGIN` | 로그인 요청 | `{ provider }` |
| `REQUEST_LOGOUT` | 로그아웃 요청 | `{}` |
| `TOKEN_REFRESH_REQUEST` | 토큰 갱신 요청 | `{}` |

---

## 🌐 Web Side (Next.js)

### 파일 구조

```
web/
├── lib/
│   └── message-bridge.ts        # MessageBridge 클래스 (싱글톤)
├── hooks/
│   ├── useMessageHandler.ts     # 핸들러 등록 훅
│   ├── useAuthMessage.ts        # 인증 메시지 처리
│   └── useNativeMessage.ts      # (deprecated)
└── app/
    ├── layout.tsx               # 전역 초기화
    └── page.tsx                 # 메시지 전송 예제
```

### 1. 초기화 (자동)

**`web/lib/message-bridge.ts`**에서 자동으로 `window.addEventListener('message')` 등록됨.

```typescript
import { messageBridge } from "@/lib/message-bridge";

// 컴포넌트 마운트 시
useEffect(() => {
  messageBridge.initialize();

  return () => {
    messageBridge.destroy(); // cleanup
  };
}, []);
```

### 2. Native로부터 메시지 받기

#### 방법 1: `useMessageHandler` 사용 (권장)

```typescript
import { useMessageHandler } from "@/hooks/useMessageHandler";
import { NativeToWebMessageType } from "@shared/bridge/messages";
import { useAuthStore } from "@/store/auth";

export function MyComponent() {
  const { setAuth } = useAuthStore();

  // AUTH_TOKEN 메시지만 받기
  useMessageHandler(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      if (message.type === NativeToWebMessageType.AUTH_TOKEN) {
        const { token, userId, expiresAt, provider } = message.payload;
        setAuth({ token, userId, expiresAt, provider });
      }
    },
    [setAuth]
  );

  return <div>...</div>;
}
```

#### 방법 2: 직접 등록

```typescript
import { messageBridge } from "@/lib/message-bridge";
import { NativeToWebMessageType } from "@shared/bridge/messages";

useEffect(() => {
  const cleanup = messageBridge.on(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      console.log("Token received:", message.payload.token);
    }
  );

  return cleanup; // 자동 cleanup
}, []);
```

#### 방법 3: 모든 메시지 받기

```typescript
useEffect(() => {
  const cleanup = messageBridge.onAll((message) => {
    console.log("[Native→Web]", message.type);
  });

  return cleanup;
}, []);
```

### 3. Native로 메시지 보내기

```typescript
import { messageBridge } from "@/lib/message-bridge";
import { WebToNativeMessageType } from "@shared/bridge/messages";

// 로그아웃 요청
const handleLogout = () => {
  messageBridge.sendMessage({
    type: WebToNativeMessageType.REQUEST_LOGOUT,
    payload: {},
  });
};

// 로그인 요청
const handleLogin = (provider: "google" | "kakao") => {
  messageBridge.sendMessage({
    type: WebToNativeMessageType.REQUEST_LOGIN,
    payload: { provider },
  });
};
```

### 4. 도메인별 훅 패턴

**`web/hooks/useAuthMessage.ts`** - 인증 관련 메시지 통합

```typescript
import { useMessageHandler } from "./useMessageHandler";
import { NativeToWebMessageType } from "@shared/bridge/messages";
import { useAuthStore } from "@/store/auth";

export function useAuthMessage() {
  const { setAuth, clearAuth } = useAuthStore();

  // AUTH_TOKEN 처리
  useMessageHandler(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      if (message.type === NativeToWebMessageType.AUTH_TOKEN) {
        setAuth(message.payload);
      }
    },
    [setAuth]
  );

  // LOGOUT_SUCCESS 처리
  useMessageHandler(
    NativeToWebMessageType.LOGOUT_SUCCESS,
    () => clearAuth(),
    [clearAuth]
  );

  // AUTH_ERROR 처리
  useMessageHandler(
    NativeToWebMessageType.AUTH_ERROR,
    (message) => {
      if (message.type === NativeToWebMessageType.AUTH_ERROR) {
        console.error("Auth error:", message.payload.error);
      }
    },
    []
  );
}
```

**사용:**

```typescript
export default function Home() {
  useAuthMessage(); // 이 한 줄이면 끝!

  return <main>...</main>;
}
```

---

## 📱 App Side (Expo)

### 파일 구조

```
app/
├── utils/
│   └── webview-bridge.ts        # WebViewBridge 클래스 (싱글톤)
├── hooks/
│   └── useAuth.ts               # 인증 + bridge 통합
└── app/
    └── index.tsx                # WebView 컨테이너
```

### 1. 초기화

```typescript
import { webViewBridge } from "@app/utils/webview-bridge";
import { useRef } from "react";
import type { WebView } from "react-native-webview";

export default function App() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // WebView ref와 함께 초기화
    webViewBridge.initialize(webViewRef);
  }, []);

  return (
    <WebView
      ref={webViewRef}
      onMessage={(event) => {
        webViewBridge.handleMessage(event);
      }}
    />
  );
}
```

### 2. Web으로 메시지 보내기

```typescript
import { webViewBridge } from "@app/utils/webview-bridge";
import { createAuthTokenMessage } from "@sam-pyeong-oh/shared";

// 로그인 성공 시 토큰 전송
const sendAuthToken = () => {
  const message = createAuthTokenMessage(
    "token-123",
    "user-456",
    Date.now() + 3600000,
    "google"
  );
  webViewBridge.sendMessage(message);
};

// 로그아웃 성공 알림
const sendLogoutSuccess = () => {
  webViewBridge.sendMessage({
    type: NativeToWebMessageType.LOGOUT_SUCCESS,
    payload: {},
  });
};
```

### 3. Web으로부터 메시지 받기

```typescript
import { webViewBridge } from "@app/utils/webview-bridge";
import { WebToNativeMessageType } from "@sam-pyeong-oh/shared";

useEffect(() => {
  // REQUEST_LOGOUT 메시지 처리
  const cleanup1 = webViewBridge.on(
    WebToNativeMessageType.REQUEST_LOGOUT,
    () => {
      console.log("Logout requested from Web");
      performLogout();
    }
  );

  // REQUEST_LOGIN 메시지 처리
  const cleanup2 = webViewBridge.on(
    WebToNativeMessageType.REQUEST_LOGIN,
    (message) => {
      if (message.type === WebToNativeMessageType.REQUEST_LOGIN) {
        const { provider } = message.payload;
        performLogin(provider);
      }
    }
  );

  return () => {
    cleanup1();
    cleanup2();
  };
}, []);
```

### 4. useAuth 훅 통합 예제

**`app/hooks/useAuth.ts`**에서 bridge 자동 통합:

```typescript
import { webViewBridge } from "@app/utils/webview-bridge";

export function useAuth(webViewRef?: RefObject<WebView | null>) {
  // Bridge 초기화
  useEffect(() => {
    if (webViewRef) {
      webViewBridge.initialize(webViewRef);
    }
  }, [webViewRef]);

  // 로그인 성공 시 자동으로 Web에 전송
  const login = useCallback(async (provider: OAuthProvider) => {
    const result = await OAuthService.login(provider);

    // WebView에 토큰 전송
    if (webViewRef) {
      webViewBridge.sendMessage(
        createAuthTokenMessage(
          result.token,
          result.userId,
          result.expiresAt,
          result.provider
        )
      );
    }

    return result;
  }, [webViewRef]);

  // Web으로부터 로그인 요청 받기
  useEffect(() => {
    const cleanup = webViewBridge.on(
      WebToNativeMessageType.REQUEST_LOGIN,
      (message) => {
        if (message.type === WebToNativeMessageType.REQUEST_LOGIN) {
          login(message.payload.provider);
        }
      }
    );

    return cleanup;
  }, [login]);

  return { login, ... };
}
```

---

## ➕ 새로운 메시지 타입 추가하기

### Step 1: 타입 정의 (`shared/src/bridge/messages.ts`)

```typescript
// 1. Enum 추가
export enum NativeToWebMessageType {
  AUTH_TOKEN = "AUTH_TOKEN",
  LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
  AUTH_ERROR = "AUTH_ERROR",
  PROFILE_UPDATED = "PROFILE_UPDATED", // 👈 새로 추가
}

// 2. 인터페이스 정의
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
  | ProfileUpdatedMessage; // 👈 추가

// 4. Helper 함수 (선택사항)
export function createProfileUpdatedMessage(
  userId: string,
  displayName: string,
  avatarUrl?: string
): ProfileUpdatedMessage {
  return {
    type: NativeToWebMessageType.PROFILE_UPDATED,
    payload: { userId, displayName, avatarUrl },
  };
}
```

### Step 2: Web 핸들러 추가

**방법 A: 기존 훅에 추가**

```typescript
// web/hooks/useAuthMessage.ts
export function useAuthMessage() {
  const { setAuth, clearAuth } = useAuthStore();
  const { updateProfile } = useProfileStore(); // 👈 추가

  // ... 기존 핸들러들 ...

  // 새 핸들러
  useMessageHandler(
    NativeToWebMessageType.PROFILE_UPDATED,
    (message) => {
      if (message.type === NativeToWebMessageType.PROFILE_UPDATED) {
        updateProfile(message.payload);
      }
    },
    [updateProfile]
  );
}
```

**방법 B: 새로운 도메인 훅**

```typescript
// web/hooks/useProfileMessage.ts
import { useMessageHandler } from "./useMessageHandler";
import { NativeToWebMessageType } from "@shared/bridge/messages";
import { useProfileStore } from "@/store/profile";

export function useProfileMessage() {
  const { updateProfile } = useProfileStore();

  useMessageHandler(
    NativeToWebMessageType.PROFILE_UPDATED,
    (message) => {
      if (message.type === NativeToWebMessageType.PROFILE_UPDATED) {
        updateProfile(message.payload);
      }
    },
    [updateProfile]
  );
}
```

### Step 3: App에서 메시지 전송

```typescript
// app/hooks/useAuth.ts (또는 적절한 위치)
import { webViewBridge } from "@app/utils/webview-bridge";
import { createProfileUpdatedMessage } from "@sam-pyeong-oh/shared";

const handleProfileUpdate = (userId: string, displayName: string) => {
  webViewBridge.sendMessage(
    createProfileUpdatedMessage(userId, displayName)
  );
};
```

---

## 🎯 실전 예제

### 예제 1: Web - 로그인 버튼

```typescript
"use client";

import { messageBridge } from "@/lib/message-bridge";
import { WebToNativeMessageType } from "@shared/bridge/messages";

export function LoginButton() {
  const handleGoogleLogin = () => {
    messageBridge.sendMessage({
      type: WebToNativeMessageType.REQUEST_LOGIN,
      payload: { provider: "google" },
    });
  };

  return (
    <button onClick={handleGoogleLogin} className="...">
      Google 로그인
    </button>
  );
}
```

### 예제 2: Web - 로그아웃 버튼

```typescript
"use client";

import { messageBridge } from "@/lib/message-bridge";
import { WebToNativeMessageType } from "@shared/bridge/messages";
import { useAuthStore } from "@/store/auth";

export function LogoutButton() {
  const { clearAuth } = useAuthStore();

  const handleLogout = () => {
    // Native에 요청
    messageBridge.sendMessage({
      type: WebToNativeMessageType.REQUEST_LOGOUT,
      payload: {},
    });

    // 로컬 상태 즉시 클리어
    clearAuth();
  };

  return (
    <button onClick={handleLogout} className="...">
      로그아웃
    </button>
  );
}
```

### 예제 3: App - OAuth 완료 후 자동 전송

```typescript
import { webViewBridge } from "@app/utils/webview-bridge";
import { createAuthTokenMessage } from "@sam-pyeong-oh/shared";

const handleOAuthSuccess = async (provider: "google" | "kakao") => {
  try {
    // OAuth 실행
    const result = await OAuthService.login(provider);

    // SecureStore에 저장
    await saveAuth(result);

    // WebView에 토큰 전송
    webViewBridge.sendMessage(
      createAuthTokenMessage(
        result.token,
        result.userId,
        result.expiresAt,
        result.provider
      )
    );

    Alert.alert("성공", "로그인되었습니다");
  } catch (error) {
    console.error("Login failed:", error);
    Alert.alert("오류", "로그인에 실패했습니다");
  }
};
```

### 예제 4: Web - 토큰 자동 수신 및 저장

```typescript
import { useMessageHandler } from "@/hooks/useMessageHandler";
import { NativeToWebMessageType } from "@shared/bridge/messages";
import { useAuthStore } from "@/store/auth";

export function useAuthSync() {
  const { setAuth } = useAuthStore();

  useMessageHandler(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      if (message.type === NativeToWebMessageType.AUTH_TOKEN) {
        console.log("✅ Token received from Native");
        setAuth(message.payload);
      }
    },
    [setAuth]
  );
}
```

---

## 🔍 디버깅

### 1. 메시지 로깅

**Web:**

```typescript
// web/app/layout.tsx
useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    messageBridge.onAll((message) => {
      console.log("[Native→Web]", message.type, message.payload);
    });
  }
}, []);
```

**App:**

```typescript
// app/app/index.tsx
useEffect(() => {
  if (__DEV__) {
    webViewBridge.onAll((message) => {
      console.log("[Web→Native]", message.type, message.payload);
    });
  }
}, []);
```

### 2. 메시지 시뮬레이션

**Web (브라우저 콘솔):**

```javascript
// Native → Web 시뮬레이션
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

**App (코드):**

```typescript
// Web → Native 시뮬레이션
webViewBridge.emit({
  type: WebToNativeMessageType.REQUEST_LOGOUT,
  payload: {},
});
```

### 3. TypeScript 에러 체크

```bash
# Web
cd web && npm run type-check

# App
cd app && npm run type-check

# Shared
cd shared && npm run type-check
```

---

## 💡 Best Practices

### 1. 도메인별 훅 분리

```typescript
useAuthMessage();       // 인증 관련
useProfileMessage();    // 프로필 관련
useChatMessage();       // 채팅 관련
usePaymentMessage();    // 결제 관련
```

### 2. 의존성 배열 명시

```typescript
// ❌ 나쁜 예
useMessageHandler(type, (message) => {
  setState(message.payload); // setState 변경 시 문제
}, []); // 의존성 누락!

// ✅ 좋은 예
useMessageHandler(type, (message) => {
  setState(message.payload);
}, [setState]); // 의존성 명시
```

### 3. 에러 처리

```typescript
useMessageHandler(
  NativeToWebMessageType.AUTH_TOKEN,
  async (message) => {
    try {
      if (message.type === NativeToWebMessageType.AUTH_TOKEN) {
        await validateToken(message.payload.token);
        setAuth(message.payload);
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      toast.error("로그인에 실패했습니다");
    }
  },
  [setAuth]
);
```

### 4. Type Guard 사용

```typescript
useMessageHandler(
  NativeToWebMessageType.AUTH_TOKEN,
  (message) => {
    // Type Guard로 안전하게 payload 접근
    if (message.type === NativeToWebMessageType.AUTH_TOKEN) {
      const { token, userId } = message.payload; // ✅ 타입 안전
    }
  },
  []
);
```

### 5. Cleanup 함수 반환

```typescript
useEffect(() => {
  const cleanup1 = messageBridge.on(type1, handler1);
  const cleanup2 = messageBridge.on(type2, handler2);

  return () => {
    cleanup1();
    cleanup2();
  };
}, []);
```

---

## ✅ 체크리스트

### 새로운 메시지 타입 추가 시

- [ ] `shared/src/bridge/messages.ts`에 enum 추가
- [ ] 메시지 인터페이스 정의
- [ ] Union 타입에 추가
- [ ] Helper 함수 생성 (선택)
- [ ] Web 핸들러 등록
- [ ] App 메시지 전송 구현
- [ ] TypeScript 에러 체크
- [ ] 브라우저/시뮬레이터에서 테스트

### 일반 개발 시

- [ ] `messageBridge.initialize()` 호출 확인 (Web)
- [ ] `webViewBridge.initialize(ref)` 호출 확인 (App)
- [ ] 핸들러에서 cleanup 함수 반환
- [ ] 의존성 배열 명시
- [ ] Type Guard 사용
- [ ] 에러 처리 추가

---

## 📊 구조 비교

### 기존 방식 (Before)

```
컴포넌트A → addEventListener → 메시지 파싱 → 처리
컴포넌트B → addEventListener → 메시지 파싱 → 처리
컴포넌트C → addEventListener → 메시지 파싱 → 처리
```

**문제점:**
- ❌ 이벤트 리스너 N개
- ❌ 코드 중복 심함
- ❌ 타입 안정성 없음
- ❌ Cleanup 누락 위험

### 새로운 방식 (After)

```
MessageBridge (Web) / WebViewBridge (App)
  └─ addEventListener (1개만!)
       ├─ AUTH_TOKEN → useAuthMessage
       ├─ LOGOUT_SUCCESS → useAuthMessage
       ├─ PROFILE_UPDATED → useProfileMessage
       └─ REQUEST_LOGIN → useAuth 훅
```

**장점:**
- ✅ 이벤트 리스너 1개
- ✅ 핸들러만 추가하면 됨
- ✅ 완전한 타입 안정성
- ✅ 자동 cleanup
- ✅ Web/App 동일한 구조

---

## 🚀 요약

1. **MessageBridge (Web) / WebViewBridge (App)**: 싱글톤 클래스, 동일한 API
2. **useMessageHandler**: 타입별 핸들러 등록 (Web)
3. **webViewBridge.on()**: 타입별 핸들러 등록 (App)
4. **도메인 훅**: `useAuthMessage`, `useProfileMessage` 등으로 관심사 분리
5. **확장성**: 새로운 타입 추가는 3단계 (타입 정의 → 핸들러 → 전송)

이제 메시지가 100개가 되어도 걱정 없습니다! 🎉
