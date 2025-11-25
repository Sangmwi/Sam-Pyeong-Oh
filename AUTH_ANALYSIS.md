# 인증 시스템 분석 보고서

## 📋 개요

프로젝트는 **Supabase Auth**를 기반으로 한 OAuth 인증 시스템을 사용하며, Native App(Expo)과 Web App(Next.js) 간 WebView Bridge를 통한 토큰 동기화를 구현하고 있습니다.

---

## 🔐 1. 인증 흐름 (Authentication Flow)

### 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    인증 흐름 전체 다이어그램                        │
└─────────────────────────────────────────────────────────────────┘

1️⃣ [Native App - Expo]
   └─ 사용자 클릭 → Supabase OAuth 시작
      └─ Google OAuth 완료 → 세션 생성
         └─ expo-secure-store 저장 (자동)
            └─ access_token 추출
               └─ WebView로 AUTH_TOKEN 메시지 전송

2️⃣ [Message Bridge]
   └─ postMessage() 통신 채널
      └─ Native ↔ Web 양방향 메시지 전달

3️⃣ [Web App - Next.js]
   └─ AUTH_TOKEN 메시지 수신
      └─ Zustand Store에 토큰 저장 (메모리)
         └─ API 요청 시 Authorization 헤더 자동 추가

4️⃣ [API Routes]
   └─ requireAuth() 미들웨어
      └─ Supabase 토큰 검증
         └─ userId 추출 → Prisma 쿼리
```

### 단계별 상세 흐름

#### **Step 1: Native App에서 로그인**

**파일**: `app/services/auth/supabase-auth.ts`

1. **OAuth 시작**
   ```typescript
   const redirectUrl = makeRedirectUri({
     scheme: "sampyeongoh",
     path: "auth/callback",
   });
   
   const { data } = await supabase.auth.signInWithOAuth({
     provider: "google",
     options: {
       redirectTo: redirectUrl,
       skipBrowserRedirect: true,
     },
   });
   ```

2. **브라우저에서 인증 완료**
   ```typescript
   const result = await WebBrowser.openAuthSessionAsync(
     data.url,
     redirectUrl
   );
   ```

3. **Authorization Code → Session 교환**
   ```typescript
   const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
   ```

4. **세션 자동 저장**
   - Supabase SDK가 `expo-secure-store`에 자동 저장
   - 저장 위치: iOS Keychain / Android Keystore
   - 저장 데이터: `access_token`, `refresh_token`, `expires_at`, `user`

#### **Step 2: Native → Web 토큰 전송**

**파일**: `app/hooks/useSupabaseAuth.ts`

1. **세션 복원 및 WebView 전송**
   ```typescript
   // 세션 가져오기
   const session = await SupabaseAuthService.getSession();
   
   // WebView로 메시지 전송
   const message = createAuthTokenMessage(
     session.access_token,
     session.user.id,
     session.expires_at || Date.now() + 3600 * 1000,
     "google"
   );
   
   webViewBridge.sendMessageToRef(webViewRef, message);
   ```

2. **메시지 구조**
   ```typescript
   {
     type: "AUTH_TOKEN",
     payload: {
       token: string,        // Supabase access_token
       userId: string,       // UUID (auth.users.id)
       expiresAt: number,    // Unix timestamp (ms)
       provider: "google"
     }
   }
   ```

3. **WebView 준비 신호 처리**
   - Web App이 `WEB_APP_READY` 메시지 전송
   - Native가 이 신호를 받으면 즉시 세션 전송

#### **Step 3: Web App에서 토큰 수신**

**파일**: `web/hooks/useAuthMessage.ts`, `web/lib/message-bridge.ts`

1. **Message Bridge 초기화**
   ```typescript
   useEffect(() => {
     messageBridge.initialize(); // window.addEventListener('message')
     
     // AUTH_TOKEN 핸들러 등록
     const cleanup = messageBridge.on(
       NativeToWebMessageType.AUTH_TOKEN,
       (message) => {
         const { token, userId, expiresAt, provider } = message.payload;
         useAuthStore.getState().setAuth({ token, userId, expiresAt, provider });
       }
     );
     
     return cleanup;
   }, []);
   ```

2. **Zustand Store 저장**
   ```typescript
   // web/store/auth.ts
   setAuth: (auth) => {
     set({
       token: auth.token,
       userId: auth.userId,
       expiresAt: auth.expiresAt,
       provider: auth.provider,
     });
   }
   ```

#### **Step 4: API 요청 시 토큰 사용**

**파일**: `web/lib/api-client.ts`

1. **자동 Authorization 헤더 추가**
   ```typescript
   private getAuthHeader(): string | null {
     const { token, isAuthenticated } = useAuthStore.getState();
     if (!isAuthenticated()) return null;
     return `Bearer ${token}`;
   }
   
   async request<T>(endpoint: string, options: FetchOptions = {}) {
     const authHeader = this.getAuthHeader();
     
     return fetch(`${this.baseURL}${endpoint}`, {
       headers: {
         "Content-Type": "application/json",
         ...(authHeader && { Authorization: authHeader }),
       },
     });
   }
   ```

#### **Step 5: API 라우트에서 토큰 검증**

**파일**: `web/lib/auth-middleware.ts`

1. **토큰 검증 미들웨어**
   ```typescript
   export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
     const authHeader = req.headers.get("authorization");
     const token = extractTokenFromHeader(authHeader); // "Bearer <token>"
     
     if (!token) {
       throw new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
       });
     }
     
     // Supabase로 토큰 검증
     const supabase = await createClient();
     const { data: { user }, error } = await supabase.auth.getUser(token);
     
     if (error || !user) {
       throw new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
       });
     }
     
     return {
       userId: user.id,
       email: user.email || "",
     };
   }
   ```

2. **API 라우트에서 사용**
   ```typescript
   export async function GET(req: NextRequest) {
     const user = await requireAuth(req); // 토큰 검증
     
     // Prisma 쿼리에서 userId 사용
     const threads = await prisma.thread.findMany({
       where: { userId: user.userId },
     });
     
     return NextResponse.json({ data: threads });
   }
   ```

---

## 🗄️ 2. 스키마 구조 (Schema Structure)

### 데이터베이스 아키텍처

프로젝트는 **하이브리드 스키마** 구조를 사용합니다:
- **사용자 인증**: Supabase Auth (`auth.users` 테이블)
- **앱 데이터**: Prisma ORM (`public.threads`, `public.messages`)

### Supabase Auth 스키마

**관리 위치**: Supabase Dashboard (자동 생성)

```
auth.users
├── id (UUID)              ← Primary Key
├── email (string)
├── encrypted_password
├── email_confirmed_at
├── created_at
├── updated_at
├── user_metadata (JSONB)
│   ├── full_name
│   ├── avatar_url
│   └── provider (google)
└── raw_app_meta_data (JSONB)
```

**참고사항**:
- Supabase Auth가 자동으로 관리하는 테이블
- Prisma 스키마에 명시적으로 정의하지 않음
- `userId`는 `auth.users.id` (UUID)를 외래키처럼 참조

### Prisma 스키마

**파일**: `web/prisma/schema.prisma`

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================================================
// Thread Model
// ============================================================================
// userId references auth.users.id (Supabase Auth managed)

model Thread {
  id        Int      @id @default(autoincrement())
  userId    String   // References auth.users.id (UUID from Supabase Auth)
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  messages Message[]

  @@index([userId, createdAt])
  @@map("threads")
}

// ============================================================================
// Message Model
// ============================================================================

model Message {
  id        Int      @id @default(autoincrement())
  threadId  Int
  role      String   // 'user' | 'assistant' | 'system'
  content   String   @db.Text
  createdAt DateTime @default(now())

  // Relations
  thread Thread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@index([threadId, createdAt])
  @@map("messages")
}
```

**스키마 특징**:
- ✅ **No User Model**: 사용자는 Supabase Auth로만 관리
- ✅ **UUID 참조**: `Thread.userId`는 `auth.users.id` (UUID) 참조
- ✅ **No Foreign Key**: Prisma에서 Supabase Auth 테이블에 직접 FK 제약 불가
- ✅ **인덱스 최적화**: `userId`, `threadId`에 인덱스 추가

### 데이터 관계도

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터베이스 관계도                         │
└─────────────────────────────────────────────────────────────┘

Supabase Auth (auth.users)
│
│ id (UUID) ──────────────────┐
│                             │
│                             │ 참조 (FK 없음)
│                             │
Prisma (public.threads)       │
│                             │
│ id (Int)                    │
│ userId (String/UUID) ───────┘
│ title (String)
│ createdAt (DateTime)
│ updatedAt (DateTime)
│                             
│                             
│ id (Int) ───────────────────┐
│                             │
│                             │ FK (Cascade Delete)
│                             │
Prisma (public.messages)      │
│                             │
│ id (Int)                    │
│ threadId (Int) ─────────────┘
│ role (String)
│ content (Text)
│ createdAt (DateTime)
```

---

## 🔑 3. 토큰 구조 (Token Structure)

### 토큰 종류

프로젝트는 **Supabase Access Token**만 사용합니다 (JWT 형식).

#### **Access Token (JWT)**

**형식**: JSON Web Token (JWT)

**구조**:
```typescript
{
  // Header
  alg: "HS256",
  typ: "JWT"
  
  // Payload
  aud: "authenticated",
  exp: 1234567890,          // 만료 시간 (Unix timestamp)
  sub: "user-uuid",         // user.id (UUID)
  email: "user@example.com",
  role: "authenticated",
  iat: 1234567890,          // 발급 시간
  ...
}
```

**특징**:
- ✅ Supabase가 자동으로 생성 및 서명
- ✅ HS256 알고리즘 사용
- ✅ `sub` 필드에 `auth.users.id` (UUID) 포함
- ✅ 만료 시간: 기본 1시간 (Supabase 설정에 따라)

#### **Refresh Token**

**형식**: 문자열 (불투명 토큰)

**사용처**:
- Native App에서만 사용 (expo-secure-store 저장)
- Web App에서는 직접 사용하지 않음
- Supabase SDK가 자동으로 갱신 처리

### 토큰 저장 위치

#### **Native App (Expo)**

**저장소**: `expo-secure-store`
- **iOS**: Keychain
- **Android**: EncryptedSharedPreferences (Keystore)

**저장 구조**:
```typescript
// Supabase SDK가 자동 저장
{
  "supabase.auth.token": JSON.stringify({
    access_token: "eyJhbGc...",
    refresh_token: "xxx...",
    expires_at: 1234567890,
    user: { id: "uuid", email: "..." }
  })
}
```

**접근 방법**:
```typescript
// app/lib/supabase.ts
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(url, key, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

#### **Web App (Next.js)**

**저장소**: Zustand Store (메모리만, 페이지 새로고침 시 초기화)

**저장 구조**:
```typescript
// web/store/auth.ts
{
  token: "eyJhbGc...",           // access_token만 저장
  userId: "uuid",
  expiresAt: 1234567890,         // Unix timestamp (ms)
  provider: "google"
}
```

**특징**:
- ⚠️ **메모리 저장만**: 브라우저 localStorage/cookie 사용 안 함
- ✅ **보안**: 페이지 새로고침 시 토큰 사라짐 (재인증 필요)
- ✅ **동기화**: Native에서 토큰 재전송 가능 (`WEB_APP_READY` 신호)

### 토큰 검증 흐름

#### **Native App에서 검증**

```typescript
// Supabase SDK가 자동 검증
const session = await supabase.auth.getSession();
if (session?.session) {
  // 유효한 세션
  // expires_at 확인 후 필요 시 자동 갱신
}
```

#### **Web App에서 검증**

```typescript
// web/lib/auth-middleware.ts
export async function requireAuth(req: NextRequest) {
  const token = extractTokenFromHeader(req.headers.get("authorization"));
  
  // Supabase로 토큰 검증
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  
  return { userId: user.id, email: user.email };
}
```

### 토큰 갱신 (Refresh)

#### **Native App**

```typescript
// Supabase SDK 자동 갱신
{
  autoRefreshToken: true,  // 자동 갱신 활성화
  persistSession: true,
}

// 수동 갱신도 가능
await supabase.auth.refreshSession();
```

#### **Web App**

현재 구현에서는 **자동 갱신 없음**:
- 토큰 만료 시 → 401 에러 → Native에서 재로그인 필요
- 향후 개선 가능: `TOKEN_REFRESH_REQUEST` 메시지 구현

---

## 📊 4. 핵심 파일 구조

### 인증 관련 주요 파일

```
프로젝트 루트/
├── app/                                    # Native App (Expo)
│   ├── lib/
│   │   └── supabase.ts                    # Supabase 클라이언트 (SecureStore 통합)
│   ├── services/auth/
│   │   └── supabase-auth.ts               # OAuth 인증 서비스
│   └── hooks/
│       └── useSupabaseAuth.ts             # 인증 Hook (WebView 통신)
│
├── web/                                    # Web App (Next.js)
│   ├── lib/
│   │   ├── auth-middleware.ts             # API 토큰 검증 미들웨어
│   │   ├── api-client.ts                  # API 클라이언트 (자동 Authorization 헤더)
│   │   ├── message-bridge.ts              # WebView 메시지 브릿지
│   │   └── supabase/
│   │       ├── client.ts                  # 브라우저 Supabase 클라이언트
│   │       └── server.ts                  # 서버 Supabase 클라이언트
│   ├── store/
│   │   └── auth.ts                        # Zustand 인증 스토어
│   └── hooks/
│       └── useAuthMessage.ts              # 인증 메시지 핸들러
│
├── shared/                                 # 공유 코드
│   └── src/
│       ├── bridge/
│       │   └── messages.ts                # 메시지 타입 정의
│       └── utils/
│           └── auth.ts                    # 인증 유틸리티
│
└── web/prisma/
    └── schema.prisma                      # Prisma 스키마 (Thread, Message)
```

---

## 🔒 5. 보안 고려사항

### ✅ 구현된 보안 기능

1. **OS 레벨 보안 스토리지**
   - Native: iOS Keychain / Android Keystore
   - 자동 암호화 및 생체 인증 지원 가능

2. **HTTPS 통신**
   - 모든 API 요청 HTTPS
   - OAuth 리다이렉트도 HTTPS

3. **토큰 검증**
   - Supabase 서버에서 토큰 서명 검증
   - 만료 시간 자동 확인

4. **메모리 저장 (Web)**
   - Web App은 메모리만 사용 (localStorage 미사용)
   - 페이지 새로고침 시 토큰 자동 삭제

### ⚠️ 개선 가능한 영역

1. **Web App 토큰 갱신**
   - 현재: 토큰 만료 시 재로그인 필요
   - 개선: `TOKEN_REFRESH_REQUEST` 메시지로 Native에서 갱신 요청

2. **CSRF 보호**
   - 현재: 기본 CORS 설정만
   - 개선: CSRF 토큰 추가 고려

3. **토큰 만료 시간 표시**
   - 현재: 만료 시간만 저장
   - 개선: 사용자에게 남은 시간 표시

---

## 📝 6. 요약

### 인증 흐름 요약

| 단계 | 위치 | 동작 |
|------|------|------|
| 1. 로그인 시작 | Native App | Supabase OAuth 시작 |
| 2. 인증 완료 | Google / Browser | OAuth 콜백 |
| 3. 세션 생성 | Native App | Code → Session 교환 |
| 4. 토큰 저장 | Native App | expo-secure-store 자동 저장 |
| 5. 토큰 전송 | Native → Web | AUTH_TOKEN 메시지 |
| 6. 토큰 저장 | Web App | Zustand Store (메모리) |
| 7. API 요청 | Web App | Authorization 헤더 자동 추가 |
| 8. 토큰 검증 | API Route | Supabase 토큰 검증 |

### 스키마 요약

- **사용자 인증**: Supabase Auth (`auth.users`)
- **앱 데이터**: Prisma (`public.threads`, `public.messages`)
- **관계**: `Thread.userId` → `auth.users.id` (UUID 참조)

### 토큰 요약

- **타입**: JWT (Supabase Access Token)
- **저장 위치**:
  - Native: expo-secure-store (영구 저장)
  - Web: Zustand Store (메모리만)
- **검증**: Supabase 서버 검증
- **갱신**: Native 자동 갱신, Web 수동/없음

---

## 📚 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Expo SecureStore 문서](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Prisma Schema 문서](https://www.prisma.io/docs/concepts/components/prisma-schema)
- 프로젝트 문서: `docs/supabase-auth-migration.md`

