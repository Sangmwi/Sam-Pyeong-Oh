# Sam-Pyeong-Oh (삼평오) 프로젝트 인수인계 문서

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [아키텍처 설계](#아키텍처-설계)
4. [핵심 설계 결정사항](#핵심-설계-결정사항)
5. [디렉토리 구조](#디렉토리-구조)
6. [환경 설정](#환경-설정)
7. [인증 플로우](#인증-플로우)
8. [WebView 메시지 브릿지](#webview-메시지-브릿지)
9. [알려진 문제와 해결책](#알려진-문제와-해결책)
10. [다음 단계](#다음-단계)

---

## 프로젝트 개요

**Sam-Pyeong-Oh**는 React Native 앱 안에 Next.js 웹을 WebView로 임베딩하는 하이브리드 아키텍처입니다.

### 핵심 컨셉
- **Native Container**: Expo (React Native) 앱이 인증과 WebView 컨테이너 역할
- **Web UI**: Next.js 15 App Router가 실제 사용자 UI 제공
- **Auth Flow**: Supabase Auth의 Google OAuth를 Native에서 처리 → WebView로 토큰 전달
- **Shared Types**: 공통 타입과 유틸리티를 `@shared` 패키지로 관리

### 왜 이 구조인가?
1. **빠른 UI 개발**: Next.js로 웹 개발 속도 확보
2. **Native 기능 활용**: 푸시 알림, 카메라 등 필요시 Native 확장 가능
3. **인증 보안**: OAuth는 Native에서 처리 (WebView redirect 문제 회피)
4. **타입 안정성**: Monorepo + TypeScript로 Web-Native 간 타입 공유

---

## 기술 스택

### Frontend
- **React 19**: 최신 React (Concurrent Features)
- **Next.js 15.5.6**: App Router, Server Components
- **Tailwind CSS v4**: 유틸리티 기반 스타일링
- **Zustand 5**: 경량 상태 관리 (메모리 전용)

### Mobile
- **Expo 52**: React Native 개발 플랫폼
- **React Native 0.76**: Native 런타임
- **Expo Router 6**: File-based routing
- **react-native-webview**: WebView 컴포넌트

### Backend & Auth
- **Supabase**: PostgreSQL + Auth + Realtime
- **Prisma 6**: ORM (앱 데이터만 관리)
- **Next.js API Routes**: REST API 엔드포인트

### 개발 도구
- **TypeScript 5.7**: 엄격한 타입 체킹
- **npm workspaces**: Monorepo 관리
- **Zod 3**: 런타임 스키마 검증

---

## 아키텍처 설계

### 1. Monorepo 구조

```
Sam-Pyeong-Oh/
├── web/                    # Next.js 애플리케이션
│   ├── app/               # App Router
│   │   ├── api/          # API Routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/              # 핵심 유틸리티
│   │   ├── supabase/     # Supabase 클라이언트
│   │   ├── api-client.ts # Fetch wrapper
│   │   ├── auth-middleware.ts
│   │   ├── db.ts         # Prisma
│   │   └── message-bridge.ts
│   ├── hooks/            # React hooks
│   ├── store/            # Zustand stores
│   └── prisma/           # Database schema
│
├── app/                    # Expo 애플리케이션
│   ├── app/               # Expo Router
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── lib/              # 핵심 유틸리티
│   │   └── supabase.ts
│   ├── services/         # 비즈니스 로직
│   │   └── auth/
│   ├── hooks/            # React hooks
│   ├── components/       # React components
│   └── utils/            # 유틸리티 함수
│
└── shared/                 # 공유 코드
    └── src/
        ├── bridge/        # Message 타입 정의
        ├── types/         # API DTOs
        ├── schemas/       # Zod schemas
        └── utils/         # 공통 유틸리티
```

### 2. 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                      사용자 액션                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Native App (Expo)                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Google OAuth 로그인                               │  │
│  │     └─> Supabase Auth                                │  │
│  │  2. expo-secure-store에 세션 저장                     │  │
│  │  3. WebView에 access_token 전달                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ injectJavaScript()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  WebView (Next.js)                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. messageBridge가 토큰 수신                         │  │
│  │  5. Zustand store에 저장 (메모리만)                   │  │
│  │  6. apiClient가 자동으로 Authorization 헤더 추가      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  API Routes (Next.js)                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  7. auth-middleware가 Supabase로 토큰 검증            │  │
│  │  8. Prisma로 앱 데이터 CRUD                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - auth.users: 사용자 계정 (Supabase 관리)            │  │
│  │  - public.Thread: 대화 스레드 (Prisma 관리)           │  │
│  │  - public.Message: 메시지 (Prisma 관리)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3. 인증 아키텍처

**핵심**: Supabase Auth를 사용하되, **사용자 테이블은 Supabase가 관리**, **앱 데이터는 Prisma가 관리**

#### Supabase Auth 책임
- `auth.users` 테이블 관리
- OAuth 제공자 연동 (Google)
- Access token, Refresh token 발급
- 토큰 검증 및 갱신

#### Prisma 책임
- `Thread`, `Message` 등 앱 데이터 스키마
- `userId` 컬럼으로 `auth.users.id` 참조 (Foreign Key 없음)
- CRUD 로직

#### 왜 분리했나?
1. **Supabase Auth의 강점 활용**: OAuth 플로우가 이미 완성되어 있음
2. **Prisma의 타입 안정성**: 앱 데이터는 TypeScript로 강력하게 타입화
3. **유연성**: 나중에 Auth 제공자 변경 시 앱 데이터는 영향 없음

---

## 핵심 설계 결정사항

### 1. ❌ localStorage 사용 안 함 → ✅ 메모리 전용 Zustand

**이유**:
- WebView의 localStorage는 앱 재시작 시 초기화될 수 있음
- 보안상 민감한 토큰을 브라우저 저장소에 두지 않음
- Native에서 `expo-secure-store`로 이미 안전하게 보관 중

**대신**:
```typescript
// web/store/auth.ts
export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  userId: null,
  // persist 없음 - 메모리 전용
}));
```

### 2. ❌ Kakao OAuth 제거 → ✅ Google OAuth만

**이유**:
- Kakao OAuth는 redirect URL 검증이 엄격 (`sampyeongoh://` 스킴 허용 안 함)
- MVP에는 Google OAuth만으로 충분
- 필요 시 나중에 추가 가능

### 3. ✅ Base64 인코딩으로 메시지 전송

**문제**: JSON 문자열을 JavaScript 템플릿 리터럴에 넣으면 이스케이프 문제 발생

**해결**:
```typescript
// Native side (app/utils/webview-bridge.ts)
const serialized = JSON.stringify(message);
const base64Message = btoa(unescape(encodeURIComponent(serialized)));

const jsCode = `
  var messageStr = decodeURIComponent(escape(atob('${base64Message}')));
  window.postMessage(messageStr, '*');
`;
webViewRef.current.injectJavaScript(jsCode);
```

**장점**:
- 특수문자 이스케이프 불필요
- Base64는 안전한 문자만 포함 (A-Z, a-z, 0-9, +, /, =)
- 브라우저/React Native 모두 `btoa`/`atob` 지원

### 4. ✅ 단방향 메시지 핸들러 패턴

```typescript
// Native → Web
webViewBridge.on(MessageType.AUTH_TOKEN, (message) => {
  setAuth(message.payload);
});

// Web → Native
sendMessage(createWebAppReadyMessage());
```

**특징**:
- 타입 안전성 (TypeScript discriminated union)
- 다중 핸들러 지원
- 자동 cleanup (React useEffect와 호환)

---

## 디렉토리 구조

### Web Workspace

```
web/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   └── threads/              # 스레드 CRUD
│   │       └── route.ts
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # 홈 페이지
│
├── lib/                          # 핵심 라이브러리
│   ├── supabase/
│   │   ├── client.ts            # 브라우저 클라이언트
│   │   └── server.ts            # 서버 클라이언트 (SSR)
│   ├── api-client.ts            # Fetch wrapper (auto auth)
│   ├── auth-middleware.ts       # API 토큰 검증
│   ├── db.ts                    # Prisma client
│   └── message-bridge.ts        # WebView 메시지 수신
│
├── hooks/                        # React hooks
│   ├── useAuthMessage.ts        # 인증 메시지 처리
│   ├── useMessageHandler.ts     # 메시지 핸들러 등록
│   └── useNativeMessage.ts      # Native로 메시지 전송
│
├── store/                        # Zustand stores
│   └── auth.ts                  # 인증 상태 (메모리 전용)
│
└── prisma/
    └── schema.prisma            # 데이터베이스 스키마
```

### App Workspace

```
app/
├── app/                          # Expo Router
│   ├── _layout.tsx              # Root layout
│   ├── index.tsx                # 인증 게이트 + WebView
│   └── auth/                    # 인증 화면
│       └── callback.tsx         # OAuth callback
│
├── lib/
│   └── supabase.ts              # Supabase client (RN)
│
├── services/
│   └── auth/
│       └── supabase-auth.ts     # Auth 비즈니스 로직
│
├── hooks/
│   └── useSupabaseAuth.ts       # 인증 + WebView 브릿지
│
├── components/
│   └── AppWebView.tsx           # WebView 컴포넌트
│
└── utils/
    └── webview-bridge.ts        # Native → Web 메시지 전송
```

### Shared Workspace

```
shared/
└── src/
    ├── bridge/
    │   └── messages.ts          # 메시지 타입 정의
    │       ├── NativeToWebMessage (AUTH_TOKEN, LOGOUT_SUCCESS, AUTH_ERROR)
    │       └── WebToNativeMessage (WEB_APP_READY, REQUEST_LOGOUT)
    │
    ├── types/
    │   └── api.ts               # API 공통 타입
    │
    └── schemas/
        └── thread.ts            # Zod 스키마
```

---

## 환경 설정

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. **Settings → API**에서 확인:
   - `Project URL`: `https://xxxxx.supabase.co`
   - `anon public key`: `eyJhbGci...`

3. **Settings → Database**에서 Connection String 확인:
   - `Connection string` (Pooling): `DATABASE_URL`에 사용
   - `Direct connection`: `DIRECT_URL`에 사용

### 2. Google OAuth 설정

#### Google Cloud Console
1. [console.cloud.google.com](https://console.cloud.google.com) → 새 프로젝트
2. **APIs & Services → Credentials → Create OAuth 2.0 Client**
3. **Authorized redirect URIs**에 추가:
   ```
   https://xxxxx.supabase.co/auth/v1/callback
   ```
4. Client ID와 Client Secret 복사

#### Supabase Dashboard
1. **Authentication → Providers → Google**
2. Enable 체크
3. Google Client ID, Secret 입력
4. **Redirect URL** 확인: `https://xxxxx.supabase.co/auth/v1/callback`

### 3. 환경 변수 설정

#### Web (`.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Database (Prisma)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Optional
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

#### App (`.env`)
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# WebView URL
EXPO_PUBLIC_WEB_URL=http://localhost:3000
# Android emulator: http://10.0.2.2:3000
# iOS simulator: http://localhost:3000
# Physical device: http://<YOUR_IP>:3000
```

### 4. 프로젝트 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. Shared 패키지 빌드
npm run build:shared

# 3. Prisma 클라이언트 생성
cd web
npm run db:generate
npm run db:push

# 4. Web 개발 서버 실행
npm run dev:web
# → http://localhost:3000

# 5. App 개발 서버 실행 (다른 터미널)
npm run dev:app
# → QR 코드 스캔
```

---

## 인증 플로우

### 1. 초기 로드 (앱 시작)

```
┌─────────────┐
│ App Launch  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────┐
│ app/app/index.tsx                 │
│ - useSupabaseAuth() 호출          │
│ - expo-secure-store에서 세션 복원 │
└──────┬───────────────────────────┘
       │
       ├─ 세션 있음 ─────────┐
       │                      │
       ▼                      ▼
┌─────────────┐      ┌──────────────────┐
│ 로그인 화면  │      │ WebView 렌더링    │
└─────────────┘      └──────────────────┘
```

### 2. Google OAuth 로그인

```typescript
// app/hooks/useSupabaseAuth.ts
const login = async () => {
  const result = await SupabaseAuthService.signInWithGoogle();
  // → expo-auth-session으로 OAuth 플로우
  // → Supabase가 세션 발급
  // → expo-secure-store에 저장

  sendSessionToWebView(result.session);
};
```

**플로우**:
1. 사용자가 "Google로 계속하기" 버튼 클릭
2. `expo-auth-session`이 브라우저 열기
3. 사용자 Google 로그인
4. Supabase가 `sampyeongoh://auth/callback`으로 리다이렉트
5. Native 앱이 세션 받아서 저장
6. WebView에 토큰 전송

### 3. Native → WebView 토큰 전달

```typescript
// app/hooks/useSupabaseAuth.ts
webViewBridge.on(WebToNativeMessageType.WEB_APP_READY, async () => {
  const session = await SupabaseAuthService.getSession();

  if (session) {
    const message = createAuthTokenMessage(
      session.access_token,
      session.user.id,
      session.expires_at,
      "google"
    );

    webViewBridge.sendMessage(message);
  }
});
```

**플로우**:
1. WebView 로드 완료 → `WEB_APP_READY` 메시지 전송
2. Native가 메시지 수신 → 저장된 세션 확인
3. Base64로 인코딩된 `AUTH_TOKEN` 메시지를 WebView에 injection
4. WebView의 `messageBridge`가 수신 → Zustand store 업데이트

### 4. WebView에서 API 호출

```typescript
// web/lib/api-client.ts
class APIClient {
  async get<T>(endpoint: string): Promise<T> {
    const token = useAuthStore.getState().token;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }
}
```

**플로우**:
1. 컴포넌트에서 `apiClient.get('/api/threads')` 호출
2. `apiClient`가 Zustand에서 토큰 가져오기
3. `Authorization: Bearer <token>` 헤더 자동 추가
4. API Route가 `auth-middleware`로 토큰 검증
5. Prisma로 데이터 조회 → 응답

---

## WebView 메시지 브릿지

### 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                      Native Side                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ webViewBridge (Singleton)                         │  │
│  │ - sendMessage(message): injectJavaScript() 호출   │  │
│  │ - on(type, handler): 핸들러 등록                  │  │
│  │ - handleMessage(event): Web → Native 수신         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ injectJavaScript()
                           │ window.postMessage()
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       Web Side                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ messageBridge (Singleton)                         │  │
│  │ - initialize(): window.addEventListener 등록      │  │
│  │ - on(type, handler): 핸들러 등록                  │  │
│  │ - handleMessage(message): 메시지 처리             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Native → Web 메시지 전송

```typescript
// app/utils/webview-bridge.ts
class WebViewBridge {
  sendMessage(message: NativeToWebMessage): void {
    const serialized = JSON.stringify(message);

    // Base64 인코딩 (이스케이프 문제 회피)
    const base64Message = btoa(unescape(encodeURIComponent(serialized)));

    const jsCode = `
      (function() {
        try {
          var base64Str = '${base64Message}';
          var messageStr = decodeURIComponent(escape(atob(base64Str)));

          window.postMessage(messageStr, '*');
        } catch (err) {
          console.error('[WebViewBridge] Error:', err);
        }
      })();
      true;
    `;

    this.webViewRef.current.injectJavaScript(jsCode);
  }
}
```

### Web → Native 메시지 전송

```typescript
// web/hooks/useNativeMessage.ts
export function useNativeMessage() {
  const sendMessage = useCallback((message: WebToNativeMessage) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }, []);

  return { sendMessage };
}
```

### 메시지 타입 정의

```typescript
// shared/src/bridge/messages.ts

// Native → Web
export type NativeToWebMessage =
  | AuthTokenMessage      // 로그인 성공 시 토큰 전달
  | LogoutSuccessMessage  // 로그아웃 완료
  | AuthErrorMessage;     // 인증 오류

// Web → Native
export type WebToNativeMessage =
  | WebAppReadyMessage    // WebView 로드 완료
  | RequestLogoutMessage; // 로그아웃 요청
```

### 사용 예시

#### Native에서 메시지 수신
```typescript
// app/hooks/useSupabaseAuth.ts
webViewBridge.on(WebToNativeMessageType.WEB_APP_READY, async () => {
  console.log("WebView ready!");
  const session = await getSession();
  webViewBridge.sendMessage(createAuthTokenMessage(session));
});
```

#### Web에서 메시지 수신
```typescript
// web/hooks/useAuthMessage.ts
useMessageHandler<AuthTokenMessage>(
  NativeToWebMessageType.AUTH_TOKEN,
  (message) => {
    const { token, userId, expiresAt, provider } = message.payload;
    setAuth({ token, userId, expiresAt, provider });
  },
  [setAuth]
);
```

---

## 알려진 문제와 해결책

### 1. ❌ 무한 리렌더링 루프

**증상**:
```
ERROR: Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

**원인**:
```typescript
// ❌ 잘못된 코드
export function useAuthMessage() {
  console.log("This runs on every render!"); // 💥

  const { sendMessage } = useNativeMessage();

  useEffect(() => {
    sendMessage(createWebAppReadyMessage());
  }, [sendMessage]); // sendMessage가 매번 새로 생성됨 💥
}
```

**해결**:
```typescript
// ✅ 올바른 코드
export function useNativeMessage() {
  const sendMessage = useCallback((message) => {
    // ...
  }, []); // 빈 의존성 배열 - 함수 재생성 방지

  return { sendMessage };
}

export function useAuthMessage() {
  // console.log는 useEffect 안에서만
  useEffect(() => {
    console.log("Sending WEB_APP_READY");
    sendMessage(createWebAppReadyMessage());
  }, [sendMessage]); // 이제 안정적
}
```

**교훈**:
- Hook body에서 직접 console.log 금지
- 다른 Hook에서 반환하는 함수는 `useCallback`으로 감싸기

### 2. ❌ Buffer is not defined (React Native)

**증상**:
```
ERROR: [ReferenceError: Property 'Buffer' doesn't exist]
```

**원인**:
```typescript
// ❌ Node.js API는 React Native에 없음
const base64 = Buffer.from(serialized).toString('base64');
```

**해결**:
```typescript
// ✅ 브라우저 호환 API 사용
const base64 = btoa(unescape(encodeURIComponent(serialized)));
```

### 3. ❌ WebView에서 메시지 안 받아짐

**증상**:
- Native 로그: `[WebViewBridge] Message injected: AUTH_TOKEN` ✅
- Web 로그: 아무것도 안 나옴 ❌

**원인**: JavaScript 템플릿 리터럴에 특수문자 포함 시 구문 오류

**해결**: Base64 인코딩
```typescript
// ✅ Base64로 안전하게 전송
const base64Message = btoa(unescape(encodeURIComponent(serialized)));
const jsCode = `
  var messageStr = decodeURIComponent(escape(atob('${base64Message}')));
  window.postMessage(messageStr, '*');
`;
```

### 4. ❌ Prisma 타입 에러

**증상**:
```typescript
Type 'Session' is not assignable to type 'AuthResult["session"]'
```

**원인**: Supabase의 `Session` 타입과 커스텀 타입 불일치

**해결**:
```typescript
// app/services/auth/supabase-auth.ts
export interface AuthResult {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number; // optional로 변경
    user: {
      id: string;
      email?: string;     // optional로 변경
      user_metadata: {
        name?: string;
        avatar_url?: string;
      };
    };
  };
}
```

### 5. ❌ Android Emulator에서 localhost 연결 안 됨

**증상**: WebView가 로드되지 않음

**원인**: Android Emulator는 `localhost`가 에뮬레이터 자신을 가리킴

**해결**:
```bash
# app/.env
EXPO_PUBLIC_WEB_URL=http://10.0.2.2:3000  # Android Emulator
# or
EXPO_PUBLIC_WEB_URL=http://<YOUR_IP>:3000  # Physical device
```

---

## 다음 단계

### Phase 1: 안정화 (1-2주)
- [ ] 메시지 브릿지 안정성 테스트
- [ ] 토큰 갱신 로직 구현
- [ ] 에러 핸들링 강화
- [ ] E2E 테스트 작성

### Phase 2: 기능 추가 (2-3주)
- [ ] 스레드 CRUD UI 구현
- [ ] 메시지 실시간 동기화 (Supabase Realtime)
- [ ] 프로필 관리
- [ ] 푸시 알림 (Native)

### Phase 3: 최적화 (1주)
- [ ] 코드 스플리팅
- [ ] 이미지 최적화
- [ ] 번들 사이즈 줄이기
- [ ] 성능 모니터링

### Phase 4: 배포 (1주)
- [ ] Vercel 배포 (Next.js)
- [ ] EAS Build (Expo)
- [ ] 환경 변수 관리
- [ ] CI/CD 파이프라인

---

## 참고 자료

### 공식 문서
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Expo Docs](https://docs.expo.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)

### 핵심 개념
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Supabase Auth with React Native](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript Monorepos](https://turbo.build/repo/docs/handbook/what-is-a-monorepo)

---

## 연락처

프로젝트 인수인계 관련 질문:
- 기술 문의: 위 문서 참조 또는 새 이슈 생성
- 아키텍처 설계: [docs/architecture.md](./architecture.md) 참조

---

**마지막 업데이트**: 2025-01-23
**작성자**: Claude (AI Assistant)
**버전**: 1.0.0 (Initial Handoff)
