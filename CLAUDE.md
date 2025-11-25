# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드 문서입니다.

---

## 📋 프로젝트 개요

**Sam-Pyeong-Oh (삼평오)** 는 TypeScript 기반의 풀스택 모노레포 프로젝트입니다.

### 핵심 구성

- **Web**: Next.js 15 App Router + Tailwind v4 (WebView UI + API Routes)
- **App**: Expo Dev Client (Native OAuth + WebView Container)
- **Shared**: 공통 타입, 스키마, 유틸리티
- **Database**: Supabase (PostgreSQL) + Prisma ORM

### 주요 특징

- ✅ **모노레포 구조**: npm workspaces 기반 (`web`, `shared`)
- ✅ **인증 패턴**: Native OAuth → Secure Store → WebView Bridge → Memory Store
- ✅ **메시지 브릿지**: Type-safe 네이티브↔웹 통신 시스템
- ✅ **데이터 분리**: Supabase Auth (사용자 인증) + Prisma (앱 데이터)
- ✅ **타입 안전성**: TypeScript 5.7 strict 모드

---

## 🏗️ 모노레포 구조

```
Sam-Pyeong-Oh/
├── web/                     # Next.js 15 웹 애플리케이션
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes (threads, messages 등)
│   │   ├── layout.tsx      # 루트 레이아웃
│   │   └── page.tsx        # 홈 페이지
│   ├── lib/                # 핵심 유틸리티
│   │   ├── supabase/       # Supabase 클라이언트
│   │   │   ├── client.ts   # 브라우저 클라이언트
│   │   │   └── server.ts   # 서버 클라이언트 (SSR)
│   │   ├── api-client.ts   # 자동 인증 API 클라이언트
│   │   ├── auth-middleware.ts # Supabase 토큰 검증
│   │   ├── db.ts           # Prisma 클라이언트
│   │   └── web-message-hub.ts # Web Message Hub (Native ↔ Web 통신)
│   ├── store/              # Zustand 상태 관리
│   │   └── auth.ts         # 인증 상태 (메모리 전용)
│   ├── hooks/              # React 커스텀 훅
│   └── prisma/             # 데이터베이스 스키마 (앱 데이터만)
│
├── app/                     # Expo 모바일 애플리케이션
│   ├── app/                # Expo Router
│   │   ├── _layout.tsx     # 루트 레이아웃
│   │   └── index.tsx       # 인증 게이트 + WebView
│   ├── lib/                # 핵심 유틸리티
│   │   ├── supabase.ts     # Supabase 클라이언트 (React Native)
│   │   └── native-message-hub.ts # Native Message Hub (Web ↔ Native 통신)
│   ├── services/           # 비즈니스 로직
│   │   └── auth/
│   │       └── supabase-auth.ts # Supabase Auth 서비스
│   ├── hooks/              # React 커스텀 훅
│   │   └── useSupabaseAuth.ts # 인증 상태 + Message Hub 통합
│   └── app.json            # Expo 설정
│
└── shared/                  # 공유 코드
    └── src/
        ├── bridge/         # 메시지 타입 (Native ↔ Web)
        ├── types/          # API DTO
        ├── schemas/        # Zod 검증 스키마
        └── utils/          # 공통 유틸리티
```

### Workspace 설명

| Workspace | 역할 | 주요 기술 |
|-----------|------|----------|
| **web/** | Next.js 웹앱 + API 서버 | React 19, Next.js 15, Prisma, Zustand |
| **app/** | Expo 네이티브 앱 | Expo 52, React Native 0.76, WebView |
| **shared/** | 공유 타입/유틸리티 | TypeScript, Zod |

### TypeScript 경로 별칭

```typescript
// tsconfig.base.json 설정
import { ... } from '@web/...'     // Web workspace
import { ... } from '@app/...'     // App workspace
import { ... } from '@shared/...'  // Shared workspace
```

---

## 🔐 인증 흐름 (Authentication Flow)

### 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     인증 흐름 전체 구조                        │
└─────────────────────────────────────────────────────────────┘

1️⃣ 네이티브 앱 (Expo)
   ├─ 사용자가 "Google로 계속하기" 버튼 클릭
   ├─ Supabase Auth Google OAuth 시작
   ├─ expo-secure-store에 세션 자동 저장
   └─ access_token 추출 후 WebView로 전송

2️⃣ 메시지 허브 (Native ↔ Web 통신)
   ├─ postMessage()로 AUTH_TOKEN 메시지 전송
   └─ 웹 측에서 수신 대기

3️⃣ 웹 앱 (Next.js)
   ├─ webMessageHub.on('AUTH_TOKEN') 핸들러 실행
   ├─ Zustand useAuthStore에 토큰 저장 (메모리)
   └─ API 요청 시 Authorization 헤더 자동 추가

4️⃣ API 라우트 인증
   ├─ requireAuth() 미들웨어로 토큰 검증
   ├─ supabase.auth.getUser(token) 호출
   └─ userId 추출 → Prisma 쿼리에 사용
```

### 1️⃣ 네이티브 앱 (Expo) - OAuth 구현

**파일**: `app/lib/supabase.ts`, `app/services/auth/supabase-auth.ts`

#### Supabase 클라이언트 설정

```typescript
// app/lib/supabase.ts
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// 보안 스토리지 어댑터 (iOS Keychain, Android Keystore)
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,  // 🔐 보안 스토리지 사용
    autoRefreshToken: true,           // ✅ 자동 토큰 갱신
    persistSession: true,             // ✅ 세션 영속화
    detectSessionInUrl: false,        // Deep link 자동 감지 비활성화
  },
});
```

#### Google OAuth 흐름

```typescript
// app/services/auth/supabase-auth.ts

// 1️⃣ OAuth URL 생성 및 실행
static async signInWithGoogle(): Promise<AuthResult> {
  // Redirect URL 생성 (sampyeongoh://auth/callback)
  const redirectUrl = makeRedirectUri({
    scheme: "sampyeongoh",
    path: "auth/callback",
  });

  // OAuth 시작
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,  // 자체 처리
    },
  });

  // 2️⃣ 브라우저에서 OAuth URL 열기
  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectUrl
  );

  // 3️⃣ Authorization code 추출 및 세션 교환
  const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

  // 4️⃣ 세션 자동 저장 (expo-secure-store)
  return { session: sessionData.session };
}
```

**주요 포인트**:
- `expo-secure-store`: OS 레벨 보안 스토리지 (iOS Keychain, Android Keystore)
- `autoRefreshToken: true`: Supabase가 자동으로 토큰 갱신
- Deep Link: `sampyeongoh://auth/callback`

### 2️⃣ 메시지 허브 시스템

**파일**:
- `shared/src/bridge/messages.ts` (메시지 타입 정의)
- `web/lib/web-message-hub.ts` (Web Message Hub)
- `app/lib/native-message-hub.ts` (Native Message Hub)

#### 메시지 타입 정의

```typescript
// shared/src/bridge/messages.ts

// Native → Web 메시지
enum NativeToWebMessageType {
  AUTH_TOKEN = "AUTH_TOKEN",        // 로그인 토큰 전달
  AUTH_ERROR = "AUTH_ERROR",        // 인증 실패
  LOGOUT_SUCCESS = "LOGOUT_SUCCESS" // 로그아웃 완료
}

// AUTH_TOKEN 메시지 구조
interface AuthTokenMessage {
  type: NativeToWebMessageType.AUTH_TOKEN;
  payload: {
    token: string;        // Supabase access_token
    userId: string;       // user.id (UUID)
    expiresAt: number;    // 만료 시간 (Unix timestamp)
    provider: "google";   // OAuth 제공자
  };
}

// Web → Native 메시지
enum WebToNativeMessageType {
  REQUEST_LOGIN = "REQUEST_LOGIN",
  REQUEST_LOGOUT = "REQUEST_LOGOUT",
  TOKEN_REFRESH_REQUEST = "TOKEN_REFRESH_REQUEST",
  WEB_APP_READY = "WEB_APP_READY"
}
```

#### Web Message Hub 구현 (싱글톤)

**파일**: `web/lib/message-bridge.ts`

```typescript
/**
 * Web Message Hub
 *
 * Web 플랫폼(Next.js)에서 동작하는 메시지 허브
 * - Native → Web 메시지 수신
 * - Web → Native 메시지 발신
 */
class WebMessageHub {
  private handlers = new Map();
  private globalHandlers = new Set();

  // 특정 메시지 타입 핸들러 등록
  on<T>(type: string, handler: Function): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Cleanup 함수 반환 (useEffect에서 사용)
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  // 모든 메시지의 글로벌 핸들러
  onAll(handler: Function): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  // Web → Native 메시지 전송
  sendMessage(message: WebToNativeMessage): void {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  // 초기화 (window.addEventListener)
  initialize(): void {
    this.messageListener = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    window.addEventListener("message", this.messageListener);
  }

  // 정리
  destroy(): void {
    if (this.messageListener) {
      window.removeEventListener("message", this.messageListener);
    }
  }
}

// 싱글톤 인스턴스
export const webMessageHub = new WebMessageHub();

// 하위 호환성을 위한 레거시 export (deprecated)
/** @deprecated Use webMessageHub instead */
export const messageBridge = webMessageHub;
```

**사용 예시 (React)**:

```typescript
// 웹앱 최상위 컴포넌트 (layout.tsx 등)
useEffect(() => {
  // 1️⃣ 초기화
  webMessageHub.initialize();

  // 2️⃣ AUTH_TOKEN 핸들러 등록
  const cleanup = webMessageHub.on(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      // Zustand 스토어에 토큰 저장
      useAuthStore.getState().setAuth(message.payload);
    }
  );

  // 3️⃣ WEB_APP_READY 신호 전송
  webMessageHub.sendMessage({
    type: WebToNativeMessageType.WEB_APP_READY
  });

  return () => {
    cleanup();
    webMessageHub.destroy();
  };
}, []);
```

#### Native Message Hub 구현 (싱글톤)

**파일**: `app/lib/native-message-hub.ts`

```typescript
/**
 * Native Message Hub
 *
 * Native 플랫폼(Expo/React Native)에서 동작하는 메시지 허브
 * - Web → Native 메시지 수신
 * - Native → Web 메시지 발신
 */
class NativeMessageHub {
  private handlers = new Map();
  private globalHandlers = new Set();
  private webViewRef: RefObject<WebView | null> | null = null;

  // WebView 참조 초기화
  initialize(webViewRef: RefObject<WebView | null>): void {
    this.webViewRef = webViewRef;
  }

  // 특정 WebView로 메시지 전송
  sendMessageToRef(targetRef: RefObject<WebView | null> | null, message: NativeToWebMessage): void {
    if (!targetRef?.current) return;

    // JavaScript injection을 통해 웹으로 메시지 전송
    const jsCode = `window.postMessage('${JSON.stringify(message)}', '*');`;
    targetRef.current.injectJavaScript(jsCode);
  }

  // 저장된 ref로 메시지 전송
  sendMessage(message: NativeToWebMessage): void {
    this.sendMessageToRef(this.webViewRef, message);
  }

  // WebView에서 온 메시지 처리
  handleMessage(event: WebViewMessage): void {
    const message = JSON.parse(event.nativeEvent.data);
    // 등록된 핸들러 실행...
  }
}

// 싱글톤 인스턴스
export const nativeMessageHub = new NativeMessageHub();

// 하위 호환성을 위한 레거시 export (deprecated)
/** @deprecated Use nativeMessageHub instead */
export const webViewBridge = nativeMessageHub;
```

### 3️⃣ 웹 앱 (Next.js) - 상태 관리

**파일**: `web/store/auth.ts`, `web/lib/api-client.ts`

#### Zustand 인증 스토어 (메모리 전용)

```typescript
// web/store/auth.ts
import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  userId: string | null;
  expiresAt: number | null;
  provider: "google" | null;

  setAuth: (auth: AuthPayload) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // 초기 상태 (모두 null)
  token: null,
  userId: null,
  expiresAt: null,
  provider: null,

  // 액션
  setAuth: (auth) => set({
    token: auth.token,
    userId: auth.userId,
    expiresAt: auth.expiresAt,
    provider: auth.provider,
  }),

  clearAuth: () => set({
    token: null,
    userId: null,
    expiresAt: null,
    provider: null,
  }),

  isAuthenticated: () => {
    const { token, expiresAt } = get();
    return token !== null && expiresAt !== null && Date.now() < expiresAt;
  },

  isTokenExpired: () => {
    const { expiresAt } = get();
    return expiresAt === null || Date.now() >= expiresAt;
  },
}));
```

**중요**: `localStorage` 사용 안 함 (보안 + 네이티브 앱에서 토큰 관리)

#### API 클라이언트 (자동 인증 헤더 추가)

```typescript
// web/lib/api-client.ts

class APIClient {
  private getAuthHeader(): string | null {
    const { token } = useAuthStore.getState();
    return token ? `Bearer ${token}` : null;
  }

  async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { skipAuth, headers, ...restOptions } = options;

    // 1️⃣ Zustand에서 토큰 가져오기
    const authHeader = skipAuth ? null : this.getAuthHeader();

    // 2️⃣ Authorization 헤더 자동 추가
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }), // 👈 핵심
        ...headers,
      },
    });

    // 3️⃣ 에러 처리
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API request failed");
    }

    const data: APIResponse<T> = await response.json();
    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }

  // 편의 메서드
  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, body: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) });
  }
}

export const apiClient = new APIClient();
```

**사용 예시**:

```typescript
// 자동으로 Authorization: Bearer {token} 추가됨
const threads = await apiClient.get<Thread[]>('/api/threads');

// 인증 스킵 (공개 엔드포인트)
const data = await apiClient.post('/api/public', body, { skipAuth: true });
```

### 4️⃣ API 라우트 인증 미들웨어

**파일**: `web/lib/auth-middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bearer 토큰 추출
function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

// 토큰 검증 및 사용자 정보 반환
export async function authorize(req: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) return null;

  try {
    const supabase = await createClient(); // 서버 클라이언트

    // 🔑 Supabase에 토큰 검증 요청
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("[Auth Middleware] Invalid token:", error);
      return null;
    }

    return {
      userId: user.id,      // UUID (auth.users.id)
      email: user.email || "",
    };
  } catch (error) {
    console.error("[Auth Middleware] Authorization error:", error);
    return null;
  }
}

// 인증 필수 미들웨어 (인증 실패 시 401 throw)
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await authorize(req);

  if (!user) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: { message: "Unauthorized", code: "UNAUTHORIZED" },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return user;
}
```

**API 라우트에서 사용**:

```typescript
// web/app/api/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // 🔐 인증 필수 (실패 시 401 Response throw)
    const user = await requireAuth(request);

    // user.userId와 user.email 사용 가능
    const threads = await prisma.thread.findMany({
      where: { userId: user.userId },  // 👤 사용자별 필터
      include: { messages: { take: 1 } }, // 최신 메시지 1개
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: threads,
    });
  } catch (error) {
    // requireAuth에서 throw한 401 Response 반환
    return error as Response;
  }
}
```

---

## 💻 기술 스택 (Tech Stack)

### Frontend (웹 - Next.js)

| 기술 | 버전 | 용도 |
|------|------|------|
| **React** | 19.0.0 | UI 라이브러리 |
| **Next.js** | 15.1.7 | 풀스택 프레임워크 (App Router) |
| **Tailwind CSS** | 4.1.17 | 유틸리티 기반 스타일링 |
| **Zustand** | 5.0.2 | 글로벌 상태 관리 (메모리) |
| **React Query** | 5.62.8 | 서버 상태 관리 |
| **TypeScript** | 5.7.2 | 타입 안정성 |

### Mobile (앱 - Expo)

| 기술 | 버전 | 용도 |
|------|------|------|
| **React Native** | 0.76.5 | 크로스 플랫폼 모바일 프레임워크 |
| **Expo** | 52.0.25 | React Native 개발 플랫폼 |
| **Expo Router** | 6.0.15 | 파일 기반 라우팅 |
| **expo-secure-store** | 15.0.7 | 보안 토큰 저장 |
| **expo-auth-session** | 7.0.9 | OAuth 세션 관리 |
| **react-native-webview** | 13.15.0 | WebView 컨테이너 |

### Backend (API - Next.js)

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js API Routes** | 15.1.7 | RESTful API (서버리스) |
| **Prisma** | 6.2.1 | ORM (타입 안전) |
| **Supabase PostgreSQL** | - | 관계형 데이터베이스 |
| **Supabase Auth** | - | 사용자 인증 (Google OAuth) |

### 인증 (Authentication)

| 영역 | 기술 | 용도 |
|------|------|------|
| **OAuth Provider** | Google | 소셜 로그인 |
| **세션 저장 (Mobile)** | expo-secure-store | 보안 토큰 저장 |
| **토큰 저장 (Web)** | Zustand (메모리) | 임시 저장 |
| **토큰 전달** | WebView postMessage | 네이티브↔웹 통신 |
| **검증** | supabase.auth.getUser() | API 라우트 토큰 검증 |

---

## ⚡ React Compiler

**React Compiler**는 React 19와 함께 도입된 자동 메모이제이션 기능으로, 이 프로젝트에서 전체적으로 활성화되어 있습니다.

### 핵심 개념

React Compiler는 빌드 타임에 코드를 분석하여 자동으로 최적화를 수행합니다:

- ✅ **자동 메모이제이션**: `useCallback`, `useMemo`, `React.memo` 불필요
- ✅ **불필요한 리렌더링 방지**: 자동 의존성 추적 및 최적화
- ✅ **코드 간소화**: 수동 최적화 코드 제거로 가독성 향상
- ✅ **성능 향상**: 컴파일러 수준의 최적화로 일관된 성능

### 설정 현황

#### Next.js (Web)

**파일**: `web/next.config.js`

```javascript
const nextConfig = {
  experimental: {
    reactCompiler: true,  // ✅ React Compiler 활성화
  },
};
```

#### Expo (App)

**파일**: `app/babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          'react-compiler': true,  // ✅ React Compiler 활성화
        },
      ],
    ],
  };
};
```

#### 의존성

**파일**: `package.json` (루트)

```json
{
  "devDependencies": {
    "babel-plugin-react-compiler": "^1.0.0"
  }
}
```

### 코드 작성 가이드

#### ❌ 이전 방식 (수동 메모이제이션)

```typescript
// 더 이상 필요 없음
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);

const memoizedValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const MemoizedComponent = React.memo(MyComponent);
```

#### ✅ 새로운 방식 (React Compiler 자동 처리)

```typescript
// React Compiler가 자동으로 메모이제이션 처리
const handleClick = () => {
  doSomething();
};

const value = computeExpensiveValue(a, b);

// 일반 컴포넌트로 선언 (자동 최적화)
const MyComponent = () => {
  return <div>...</div>;
};
```

### 실제 적용 사례

이 프로젝트에서는 다음 파일들에서 React Compiler를 활용하여 메모이제이션을 제거했습니다:

1. **app/hooks/useSupabaseAuth.ts**
   - `sendSessionToWebView`, `login`, `logout`, `handleWebViewMessage` 함수
   - 기존 `useCallback` 래퍼 제거

2. **app/hooks/useAuth.ts**
   - `login`, `logout`, `checkTokenExpiration`, `handleWebViewMessage` 함수
   - 기존 `useCallback` 래퍼 제거

3. **app/hooks/useSecureStorage.ts**
   - `saveAuth`, `getAuth`, `clearAuth`, `isTokenExpired`, `updateToken` 함수
   - 기존 `useCallback` 래퍼 제거

4. **app/components/WebViewContainer.tsx**
   - `handleError`, `handleHttpError`, `handleLoadStart`, `handleLoadEnd` 함수
   - 기존 `useCallback` 래퍼 제거

5. **web/hooks/useNativeMessage.ts**
   - `sendMessage` 함수
   - ⚠️ **useCallback 필수**: `useAuthMessage.ts`의 useEffect 의존성 배열에서 사용됨

### 주의사항

#### ⚠️ useEffect 의존성 배열에서 사용되는 함수는 useCallback 필수

**중요**: React Compiler가 자동 메모이제이션을 제공하지만, **useEffect의 의존성 배열에 포함되는 함수는 반드시 `useCallback`으로 래핑**해야 합니다.

```typescript
// ❌ 잘못된 예 - 무한 루프 발생
const MyComponent = () => {
  const myFunction = () => {
    // ...
  };

  useEffect(() => {
    // myFunction이 매번 새로 생성되어 useEffect가 무한 실행됨
    myFunction();
  }, [myFunction]); // 🚨 문제 발생!
};

// ✅ 올바른 예 - useCallback 사용
const MyComponent = () => {
  const myFunction = useCallback(() => {
    // ...
  }, []); // 안정적인 참조 유지

  useEffect(() => {
    myFunction();
  }, [myFunction]); // ✅ 안전
};
```

**실제 프로젝트 사례**:
- [app/hooks/useSupabaseAuth.ts:38](app/hooks/useSupabaseAuth.ts#L38): `sendSessionToWebView` - useEffect 의존성으로 사용
- [app/hooks/useAuth.ts:141](app/hooks/useAuth.ts#L141): `login` - useEffect 의존성으로 사용
- [app/hooks/useAuth.ts:202](app/hooks/useAuth.ts#L202): `logout` - useEffect 의존성으로 사용
- [web/hooks/useNativeMessage.ts:15](web/hooks/useNativeMessage.ts#L15): `sendMessage` - useEffect 의존성으로 사용 (web/hooks/useAuthMessage.ts에서)

#### 기타 주의사항

- React Compiler는 대부분의 경우 자동으로 최적화하지만, 일부 복잡한 케이스에서는 명시적 메모이제이션이 필요할 수 있습니다.
- 성능 문제가 발생할 경우 React DevTools Profiler로 확인 후 선택적으로 수동 최적화를 적용할 수 있습니다.
- React Compiler는 **컴포넌트 순수성**을 가정하므로, 부수 효과가 있는 코드는 `useEffect` 내부에서 실행해야 합니다.

### 참고 자료

- [React Compiler 공식 문서](https://react.dev/learn/react-compiler)
- [babel-plugin-react-compiler npm](https://www.npmjs.com/package/babel-plugin-react-compiler)

---

## 🗄️ 데이터베이스 아키텍처

### 책임 분리 전략

```
┌────────────────────────────────────────────────┐
│          Supabase PostgreSQL 데이터베이스          │
├────────────────────────────────────────────────┤
│                                                │
│  auth.users (Supabase Auth 관리)               │
│  ├─ id (UUID, PK)                             │
│  ├─ email                                     │
│  ├─ user_metadata (이름, 아바타 등)            │
│  └─ provider (google)                         │
│                                                │
│  ↓ userId로 참조                               │
│                                                │
│  Thread (Prisma 관리)                          │
│  ├─ id (Int, PK)                              │
│  ├─ userId (String, 참조: auth.users.id)      │
│  ├─ title (String)                            │
│  ├─ createdAt, updatedAt                      │
│  └─ messages (1:N 관계)                       │
│                                                │
│  Message (Prisma 관리)                         │
│  ├─ id (Int, PK)                              │
│  ├─ threadId (Int, FK → Thread.id)            │
│  ├─ role ('user' | 'assistant' | 'system')   │
│  ├─ content (Text)                            │
│  └─ createdAt                                 │
│                                                │
└────────────────────────────────────────────────┘
```

### Prisma 스키마

**파일**: `web/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")    // Connection Pool (PgBouncer)
  directUrl = env("DIRECT_URL")      // 마이그레이션용 (Direct)
}

// 스레드 (대화방)
model Thread {
  id        Int      @id @default(autoincrement())
  userId    String   // ← Supabase auth.users.id 참조 (외래키 없음)
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 관계: 한 스레드는 여러 메시지를 가짐
  messages Message[]

  // 인덱스: 사용자별 최신 스레드 조회 최적화
  @@index([userId, createdAt])
  @@map("threads")
}

// 메시지 (채팅)
model Message {
  id        Int      @id @default(autoincrement())
  threadId  Int
  role      String   // 'user', 'assistant', 'system'
  content   String   @db.Text
  createdAt DateTime @default(now())

  // 관계: 메시지는 하나의 스레드에 속함
  thread Thread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  // 인덱스: 스레드 내 메시지 최신순 조회 최적화
  @@index([threadId, createdAt])
  @@map("messages")
}
```

**주요 설계 결정**:

1. **userId는 Prisma 외래키 없음**
   - Supabase Auth에서 관리하므로 Prisma 제약 조건 불필요
   - RLS (Row Level Security)로 권한 제어 가능

2. **Thread → Message 1:N 관계**
   - `onDelete: Cascade`: 스레드 삭제 시 메시지도 자동 삭제

3. **인덱스 전략**
   - `[userId, createdAt]`: 사용자별 최신 스레드 조회 빠름
   - `[threadId, createdAt]`: 스레드 내 메시지 최신순 조회 빠름

4. **데이터베이스 연결**
   - `DATABASE_URL`: Connection Pool (PgBouncer) - 일반 쿼리용
   - `DIRECT_URL`: Direct Connection - 마이그레이션용

### Prisma 사용 예시

```typescript
// 사용자의 스레드 목록 조회
const threads = await prisma.thread.findMany({
  where: { userId: user.userId },
  include: {
    messages: {
      orderBy: { createdAt: 'asc' },
      take: 1 // 첫 메시지만
    }
  },
  orderBy: { updatedAt: 'desc' }
});

// 새 메시지 생성
const message = await prisma.message.create({
  data: {
    threadId: 123,
    role: 'user',
    content: '안녕하세요'
  }
});

// 스레드와 메시지 함께 생성
const thread = await prisma.thread.create({
  data: {
    userId: user.userId,
    title: '새로운 대화',
    messages: {
      create: [
        { role: 'user', content: '첫 메시지' }
      ]
    }
  },
  include: { messages: true }
});
```

---

## ⚙️ 개발 명령어 (Development Commands)

### 모노레포 루트

```bash
# 개발 서버 시작
npm run dev:web              # Next.js 개발 서버 (http://localhost:3000)
npm run dev:app              # Expo Dev Client

# 빌드
npm run build:web            # Next.js 프로덕션 빌드
npm run build:app            # Expo 앱 빌드
npm run build:shared         # Shared 패키지 빌드 (postinstall 시 자동 실행)

# 품질 검사
npm run lint                 # 모든 workspace ESLint 실행
npm run type-check           # 모든 workspace TypeScript 검증
npm run format               # Prettier로 코드 포매팅
npm run format:check         # 포매팅 확인 (변경하지 않음)

# 정리
npm run clean                # 모든 node_modules 제거
```

### Web Workspace (Next.js)

```bash
cd web

# 개발
npm run dev                  # 개발 서버 시작

# 데이터베이스 (Prisma)
npm run db:generate          # Prisma Client 생성
npm run db:push              # 스키마 변경사항 푸시 (마이그레이션 없음)
npm run db:migrate           # 마이그레이션 생성 및 적용 (개발)
npm run db:studio            # Prisma Studio (GUI) 실행

# 품질 검사
npm run lint                 # ESLint 실행
npm run type-check           # TypeScript 검증

# 빌드
npm run build                # 프로덕션 빌드
npm run start                # 프로덕션 서버 시작
```

### App Workspace (Expo)

```bash
cd app

# 개발
npm run start                # Expo Dev Client 시작
npm run start:dev            # 캐시 삭제 후 시작
npm run android              # Android 기기/에뮬레이터 실행
npm run android:dev          # Android 디버그 빌드 실행
npm run ios                  # iOS 시뮬레이터 실행
npm run web                  # 웹으로 실행

# 빌드 (EAS CLI 필요: npm install -g eas-cli)
eas build --platform android # Android APK/AAB 빌드
eas build --platform ios     # iOS 앱 빌드
eas build --platform all     # 양쪽 플랫폼 빌드
```

### Shared Workspace

```bash
cd shared

npm run build                # TypeScript 빌드
npm run dev                  # Watch 모드 (개발 중 자동 빌드)
npm run type-check           # 타입 검증
npm run clean                # dist 폴더 제거
```

---

## 🔧 환경 변수 설정 (Environment Variables)

### Web (`.env.local`)

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase 서비스 롤 키 (선택사항, 관리자 작업용)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 데이터베이스 (Supabase Dashboard에서 복사)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# 선택사항
NEXT_PUBLIC_WEB_URL=http://localhost:3000  # CORS/WebView용
```

**환경 변수 가져오기**:
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. Project Settings → API 탭
3. `URL` 복사 → `NEXT_PUBLIC_SUPABASE_URL`
4. `anon public key` 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Settings → Database → Connection String 복사

### App (`.env`)

```bash
# Supabase (필수)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WebView 타겟 URL (환경별로 다름)
EXPO_PUBLIC_WEB_URL=http://localhost:3000
# Android 에뮬레이터: http://10.0.2.2:3000
# iOS 시뮬레이터: http://localhost:3000
# 실제 기기: http://<YOUR_IP>:3000 (예: http://192.168.1.100:3000)
```

**주의사항**:
- `EXPO_PUBLIC_` 접두사: 클라이언트에 노출되는 공개 변수
- WebView URL은 실행 환경에 따라 다름
- 환경 변수 수정 후 서버 재시작 필수

### Supabase 설정

#### 1. Google OAuth 설정

1. **Google Cloud Console**:
   - OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션 유형)
   - Client ID & Secret 복사

2. **Supabase Dashboard**:
   - Authentication → Providers → Google
   - Google provider 활성화
   - Client ID & Secret 입력

3. **Redirect URL 설정**:
   ```
   http://localhost:3000/api/auth/callback/google  # 개발용
   https://yourdomain.com/api/auth/callback/google  # 프로덕션
   sampyeongoh://auth/callback  # 네이티브 앱
   ```

#### 2. Deep Link 설정 (앱)

**app.json** (Expo):
```json
{
  "expo": {
    "scheme": "sampyeongoh",
    "plugins": [
      ["expo-notifications", { "sounds": ["default"] }]
    ]
  }
}
```

---

## 🚀 개발 시작하기 (Getting Started)

### 필수 요구사항

- ✅ Node.js ≥20.0.0
- ✅ npm ≥10.0.0
- ✅ Supabase 계정 및 프로젝트
- ✅ (선택) Expo CLI, EAS CLI (`npm install -g expo-cli eas-cli`)

### 단계별 설정

#### 1. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url>
cd Sam-Pyeong-Oh

# 모든 workspace 의존성 설치
npm install  # 자동으로 shared도 빌드됨 (postinstall)
```

#### 2. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. New Project 생성
3. Settings → API에서 URL과 anon key 복사
4. Settings → Database에서 Connection String 복사

#### 3. 환경 변수 설정

**Web**:
```bash
cd web
cp .env.example .env.local
# .env.local 파일을 열어 Supabase 정보 입력
```

**App**:
```bash
cd app
cp .env.example .env
# .env 파일을 열어 Supabase 정보 입력
```

#### 4. 데이터베이스 설정

```bash
cd web

# Prisma Client 생성
npm run db:generate

# 데이터베이스 스키마 푸시 (개발)
npm run db:push
# 또는 마이그레이션 생성
npm run db:migrate
```

#### 5. 개발 서버 시작

```bash
# 터미널 1: Next.js 웹 서버
npm run dev:web

# 터미널 2: Expo 앱
npm run dev:app
# 또는 cd app && npm run start:dev
```

#### 6. 앱에서 테스트

1. Expo Go 앱 또는 Expo Dev Client에서 QR 코드 스캔
2. "Google로 계속하기" 버튼 클릭
3. Google OAuth 완료
4. WebView에서 웹앱 로드 확인
5. 메시지 브릿지 동작 확인 (콘솔 로그)

### 문제 해결 (Troubleshooting)

#### WebView 연결 오류

**증상**: Expo 앱에서 "WebView 연결 오류" 표시

**해결 방법**:
1. Next.js 개발 서버가 실행 중인지 확인 (`npm run dev:web`)
2. `EXPO_PUBLIC_WEB_URL` 환경 변수 확인
   - Android 에뮬레이터: `http://10.0.2.2:3000`
   - iOS 시뮬레이터: `http://localhost:3000`
   - 실제 기기: `http://<컴퓨터_IP>:3000`
3. 방화벽에서 포트 3000 허용 확인

#### Prisma Client 오류

**증상**: `@prisma/client` 모듈을 찾을 수 없음

**해결 방법**:
```bash
cd web
npm run db:generate  # Prisma Client 재생성
```

#### Shared 패키지 변경사항 미반영

**증상**: `@shared` 타입 변경이 web/app에 반영 안 됨

**해결 방법**:
```bash
npm run build:shared  # 수동 빌드
# 또는
cd shared && npm run dev  # Watch 모드로 자동 빌드
```

---

## 📖 주요 패턴 및 모범 사례

### 1. TypeScript 경로 별칭

```typescript
// tsconfig.base.json에서 설정됨
import { createAuthTokenMessage } from '@shared/bridge/messages';
import { apiClient } from '@web/lib/api-client';
import { supabase } from '@app/lib/supabase';
```

### 2. Shared 패키지 수정 후

```bash
# 반드시 빌드 필요
npm run build:shared

# 또는 Watch 모드 사용 (개발 중)
cd shared && npm run dev
```

### 3. Prisma 워크플로우

```bash
# 1. 스키마 수정
vim web/prisma/schema.prisma

# 2. Prisma Client 생성
npm --prefix web run db:generate

# 3. 변경사항 적용
npm --prefix web run db:push      # 프로토타이핑 (마이그레이션 없음)
npm --prefix web run db:migrate   # 프로덕션 (마이그레이션 생성)
```

### 4. 메시지 브릿지 등록 (React)

```typescript
useEffect(() => {
  // 핸들러 등록
  const cleanup = messageBridge.on(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      // 메시지 처리
    }
  );

  // 정리 함수 반환 (메모리 누수 방지)
  return cleanup;
}, []);
```

### 5. API 라우트 구조

```typescript
// web/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // 🔐 인증 필수 (실패 시 401 throw)
    const user = await requireAuth(request);

    // user.userId, user.email 사용 가능
    const data = await prisma.thread.findMany({
      where: { userId: user.userId }
    });

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    // requireAuth에서 throw한 Response 반환
    return error as Response;
  }
}
```

### 6. API 응답 형식 (일관성)

```typescript
// 성공 응답
{
  success: true,
  data: { id: 1, title: "..." }
}

// 실패 응답
{
  success: false,
  error: {
    message: "에러 메시지",
    code: "ERROR_CODE"
  }
}
```

### 7. 타입 안전성 (Type Safety)

```typescript
// @shared/types/api.ts (source of truth)
export interface ThreadDTO {
  id: number;
  userId: string;
  title: string;
  createdAt: string;
}

// web/app/api/threads/route.ts (API 라우트)
const threads: ThreadDTO[] = await prisma.thread.findMany(...);
return NextResponse.json({ success: true, data: threads });

// web 또는 app에서 사용
const threads = await apiClient.get<ThreadDTO[]>('/api/threads');
```

---

## 🔒 보안 고려사항 (Security)

### 토큰 저장

- ✅ **모바일**: `expo-secure-store` (OS 레벨 보안)
  - iOS: Keychain
  - Android: Keystore
- ✅ **웹**: Zustand 메모리 (localStorage 사용 안 함)
- ✅ **API**: `Authorization: Bearer ${token}` 헤더만 사용

### 환경 변수

- ✅ **공개 변수**: `NEXT_PUBLIC_`, `EXPO_PUBLIC_` 접두사
- ✅ **비공개 변수**: `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
- ✅ `.env*` 파일을 `.gitignore`에 추가

### API 라우트

- ✅ `requireAuth()` 미들웨어 필수
- ✅ `userId`로 데이터 필터링 (사용자별 접근 제어)
- ✅ RLS (Row Level Security) 정책 (추가 보안)

### RLS 정책 예시

```sql
-- Thread 테이블 RLS 활성화
ALTER TABLE "Thread" ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 스레드만 조회 가능
CREATE POLICY "Users can view own threads" ON "Thread"
  FOR SELECT USING (auth.uid()::text = "userId");

-- 사용자는 자신의 스레드만 생성 가능
CREATE POLICY "Users can create own threads" ON "Thread"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");
```

---

## 📚 코드 컨벤션 (Code Conventions)

### Import 정리

Prettier가 자동으로 정리 (`@ianvs/prettier-plugin-sort-imports`):

1. React/Next.js/Expo 핵심 import
2. 서드파티 패키지
3. Workspace import (`@web`, `@app`, `@shared`)
4. 상대 경로 import
5. Type import (분리)

### TypeScript

- ✅ **Strict 모드** 활성화 (모든 workspace)
- ✅ Type-only import에는 `type` 키워드 사용
- ✅ 객체 타입은 `interface` 선호 (`type`보다)
- ✅ 런타임 검증은 `@shared/schemas`의 Zod 스키마 사용

### React 패턴

- ✅ Server Components 우선 (Next.js)
- ✅ `"use client"` 지시문은 필요할 때만
- ✅ Hook 규칙 준수 (조건부 호출 금지)
- ✅ Zustand (글로벌 상태), React Query (서버 상태)

### 네이밍

- ✅ 컴포넌트: `PascalCase` (예: `UserProfile.tsx`)
- ✅ 유틸리티: `camelCase` (예: `formatDate.ts`)
- ✅ 상수: `UPPER_SNAKE_CASE` (예: `API_BASE_URL`)
- ✅ API 라우트: `lowercase-with-hyphens` (예: `api/auth/verify`)

---

## 🎯 다음 단계 (Next Steps)

### 개발 체크리스트

- [ ] Node.js ≥20, npm ≥10 설치 확인
- [ ] `npm install` 실행 (모든 workspace)
- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 설정 (`.env.local`, `.env`)
- [ ] `npm run build:shared` 실행
- [ ] `npm run dev:web` 실행 (Next.js)
- [ ] `npm run dev:app` 실행 (Expo)
- [ ] 앱에서 Google 로그인 테스트
- [ ] 메시지 브릿지 콘솔 로그 확인

### 배포 체크리스트

- [ ] 모든 환경 변수 프로덕션 값으로 설정
- [ ] `npm run lint`, `npm run type-check` 통과
- [ ] Supabase RLS 정책 설정
- [ ] Google OAuth Redirect URL 추가 (프로덕션 도메인)
- [ ] `npm run build:web` 테스트
- [ ] `eas build --platform all` 테스트
- [ ] 스테이징 환경 테스트

---

## 📞 문의 및 참고

### 주요 파일

- 📄 인증 흐름: `web/lib/auth-middleware.ts`, `app/hooks/useSupabaseAuth.ts`
- 📄 메시지 허브: `web/lib/web-message-hub.ts`, `app/lib/native-message-hub.ts`, `shared/src/bridge/messages.ts`
- 📄 API 클라이언트: `web/lib/api-client.ts`
- 📄 Prisma 스키마: `web/prisma/schema.prisma`

### 추가 자료

- [Next.js 15 문서](https://nextjs.org/docs)
- [Expo 문서](https://docs.expo.dev/)
- [Prisma 문서](https://www.prisma.io/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Zustand 문서](https://zustand-demo.pmnd.rs/)

---

**마지막 업데이트**: 2025-01-26 (파일명 및 계층 구조 개선)
