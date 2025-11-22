# Supabase Auth 마이그레이션 가이드

## 📋 개요

기존 커스텀 JWT 인증을 Supabase Auth로 완전히 전환했습니다.

### 변경 사항 요약

| 항목 | Before | After |
|------|--------|-------|
| **인증 방식** | Google OAuth → Custom JWT | Supabase Auth with Google |
| **사용자 관리** | Prisma User 모델 | Supabase auth.users |
| **세션 관리** | 수동 JWT 생성/검증 | Supabase 자동 관리 |
| **토큰 저장** | expo-secure-store (커스텀) | Supabase SDK (자동) |
| **앱 데이터** | Prisma (User, Thread, Message) | Prisma (Thread, Message만) |

## 🏗️ 새로운 아키텍처

```
┌─────────────────────────────────────────┐
│  Supabase                               │
│  ├─ auth.users (Supabase Auth)         │  ← 사용자 인증
│  ├─ public.threads (Prisma)            │  ← 앱 데이터
│  └─ public.messages (Prisma)           │  ← 앱 데이터
└─────────────────────────────────────────┘
```

### 인증 플로우

```
1. Native (Expo)
   ↓ supabase.auth.signInWithOAuth({ provider: 'google' })

2. Supabase Auth
   ↓ Google OAuth → Session 생성

3. expo-secure-store
   ↓ Session 자동 저장 (Supabase SDK)

4. WebView Bridge
   ↓ access_token 전송 (postMessage)

5. Web (Next.js)
   ↓ supabase.auth.getUser(token)

6. Prisma
   ↓ Thread/Message 조회 (userId = auth.users.id)
```

## 📦 설치된 패키지

### Web
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### App
```bash
npm install @supabase/supabase-js react-native-url-polyfill
```

## 🔧 주요 파일

### Native (Expo)

1. **`app/lib/supabase.ts`** - Supabase client 초기화
   - expo-secure-store 통합
   - 자동 세션 관리

2. **`app/services/auth/supabase-auth.ts`** - 인증 서비스
   - `signInWithGoogle()`: OAuth 로그인
   - `signOut()`: 로그아웃
   - `getSession()`: 세션 조회

3. **`app/hooks/useSupabaseAuth.ts`** - 인증 훅
   - 세션 상태 관리
   - WebView 동기화
   - `onAuthStateChange` 리스너

### Web (Next.js)

1. **`web/lib/supabase/client.ts`** - 클라이언트 컴포넌트용
2. **`web/lib/supabase/server.ts`** - 서버 컴포넌트/API 라우트용

## 🔐 환경 변수

### App (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_WEB_URL=http://localhost:3000
```

### Web (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

## ⚙️ Supabase 설정

### 1. Google OAuth Provider 설정

Supabase Dashboard → Authentication → Providers → Google:

1. **Enable Google provider**
2. **Client ID & Client Secret** (Google Cloud Console에서 획득)
3. **Redirect URLs 추가**:
   ```
   https://xxxxx.supabase.co/auth/v1/callback
   sampyeongoh://auth/callback (for mobile)
   ```

### 2. RLS (Row Level Security) 정책 설정

```sql
-- Enable RLS on threads table
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

-- Users can only access their own threads
CREATE POLICY "Users can view their own threads"
  ON public.threads FOR SELECT
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can insert their own threads"
  ON public.threads FOR INSERT
  WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update their own threads"
  ON public.threads FOR UPDATE
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can delete their own threads"
  ON public.threads FOR DELETE
  USING (auth.uid() = user_id::uuid);

-- Similar policies for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their threads"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = messages.thread_id
      AND threads.user_id::uuid = auth.uid()
    )
  );
```

## 🚀 마이그레이션 단계

### 1단계: Prisma 마이그레이션

```bash
cd web

# User 모델 제거 후 마이그레이션 생성
npx prisma migrate dev --name remove_user_model

# Prisma Client 재생성
npx prisma generate
```

### 2단계: 앱 재시작

```bash
# Web
cd web
npm run dev

# App
cd app
npm run start
```

## 🔄 구버전과의 차이

### Before (Custom JWT)
```typescript
// app/services/oauth/google.ts
const accessToken = await googleOAuth.authenticate();
// ❌ Google Access Token을 그대로 사용 (문제!)

// web/lib/jwt.ts
const token = jwt.sign(payload, JWT_SECRET);
// ❌ 수동 JWT 생성/검증
```

### After (Supabase Auth)
```typescript
// app/services/auth/supabase-auth.ts
const { session } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});
// ✅ Supabase가 세션 관리

// web/lib/supabase/server.ts
const { data: { user } } = await supabase.auth.getUser();
// ✅ Supabase가 검증
```

## ✅ 장점

1. **보안 강화**: JWT 생성/검증을 Supabase가 처리
2. **세션 관리 자동화**: Refresh token 자동 처리
3. **RLS 통합**: Row Level Security로 데이터 보호
4. **코드 간소화**: 인증 로직 대폭 감소
5. **확장성**: 추후 소셜 로그인 추가 용이

## 📝 TODO

### 완료
- [x] Supabase 클라이언트 설정
- [x] Prisma 스키마 수정
- [x] Native OAuth 리팩토링
- [x] 환경 변수 업데이트

### 진행 중
- [ ] Web API 인증 미들웨어 수정
- [ ] RLS 정책 설정
- [ ] 기존 User 데이터 마이그레이션 (필요시)

## 🐛 트러블슈팅

### 문제: "No Supabase URL provided"
**해결**: `.env` 파일에 `EXPO_PUBLIC_SUPABASE_URL` 확인

### 문제: "Unable to detect valid redirect URL"
**해결**: Supabase Dashboard에서 Redirect URLs 설정 확인

### 문제: "Session not persisting"
**해결**: `react-native-url-polyfill` 설치 확인

## 📚 참고 자료

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase with Expo](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
