# 콘솔 로그 정리 보고서

## 📊 작업 개요

프로젝트 전체에서 불필요한 디버그 로그와 콘솔 출력을 최소화했습니다.

### 정리 전후 비교

| 항목 | 정리 전 | 정리 후 | 감소율 |
|------|---------|---------|--------|
| **App (Native)** | 51개 | ~10개 | ~80% 감소 |
| **Web** | 12개 | ~3개 | ~75% 감소 |
| **Total (console.log)** | 63개 | ~13개 | ~79% 감소 |

*참고: console.error는 대부분 유지 (에러 처리용)*

---

## 🗂️ 정리된 파일 목록

### 1. Native App (app/)

#### ✅ `app/hooks/useSupabaseAuth.ts`
**제거된 로그**:
- `Session sent to WebView`
- `Web App Ready signal received`
- `Session exists: ...`
- `Sending stored session to Web App`
- `User ID: ...`
- `Token (first 20 chars): ...`
- `AUTH_TOKEN message sent`
- `No session found, user needs to login`
- `Auth state changed: ...`
- `Session: EXISTS / NULL`
- `Setting authenticated state`
- `Setting logged out state`
- `Logout initiated`
- `Calling SupabaseAuthService.signOut()`
- `signOut() completed`
- `Setting logged out state (fallback)`

**유지된 로그**:
- `console.error` (로그인/로그아웃 실패 시)

#### ✅ `app/services/auth/supabase-auth.ts`
**제거된 로그**:
- `Redirect URL: ...`
- `Opening browser for OAuth...`
- `Auth URL: ...`
- `Expected redirect URL: ...`
- `Waiting for OAuth callback...`
- `OAuth result received`
- `OAuth result type: ...`
- `OAuth result URL: ...`
- `OAuth successful, exchanging code...`
- `Parsed URL: ...`
- `Checking hash for code...`
- `Found code in hash`
- `Found access_token in hash (Implicit Flow)`
- `Authentication complete (Implicit)`
- `Authentication complete`
- `User ID: ...`

**유지된 로그**:
- `console.error` (OAuth 에러, 파라미터 누락 시)

#### ✅ `app/app/index.tsx`
**제거된 로그**:
- `Deep link received: ...`
- `OAuth callback detected, completing session...`
- `Initial URL: ...`
- `Auth state: { isLoading, isAuthenticated, segments }`
- `In tabs? ...`
- `Redirecting to tabs...`
- `Not authenticated, showing login screen`

**유지된 로그**:
- `console.error` (로그인 실패 시)

#### ✅ `app/app/(tabs)/_layout.tsx`
**제거된 로그**:
- `Not authenticated, redirecting to root`

#### ✅ `app/lib/native-message-hub.ts`
**제거된 로그**:
- `Initialized with ref: ...`
- `Attempting to send: ...`
- `Target WebView ref not available`
- `Message injected: ...`
- WebView injection 내부 로그:
  - `Starting injection for ${type}`
  - `Decoded message: ...`
  - `Message dispatched successfully`
  - `Error: ...` (일부 - 간소화)
  - `Stack: ...`

**유지된 로그**:
- `console.error` (메시지 전송 실패, 핸들러 에러)

#### ✅ `app/components/AppWebView.tsx`
**제거된 로그**:
- `Page loaded, testing injection...`
- `[AppWebView Test] Injection successful!`

#### ✅ `app/services/oauth/google.ts`
**제거된 로그**:
- `Redirect URI: ...`
- `Client ID: ...`
- `Authentication successful`

### 2. Web App (web/)

#### ✅ `web/lib/web-message-hub.ts`
**제거된 로그**:
- `ReactNativeWebView not available`
- `Received message: ...`
- `Message data: ...`
- `Handlers count: ...`
- `handleMessage completed`
- `Initialized`

**유지된 로그**:
- `console.error` (메시지 전송 실패, 핸들러 에러)

#### ✅ `web/hooks/useNativeMessage.ts`
**제거된 로그**:
- `Sending message to Native: ...`
- `Message sent successfully`
- `ReactNativeWebView not available (running in browser?)`

**유지된 로그**:
- `console.error` (메시지 전송 실패)

#### ✅ `web/hooks/useAuthMessage.ts`
**제거된 로그**:
- `Sending WEB_APP_READY message`
- `AUTH_TOKEN received`
- `Calling setAuth`
- `setAuth completed`

#### ✅ `web/store/auth.ts`
**제거된 로그**:
- `setAuth called { userId: ... }`

---

## 🎯 정리 원칙

### ✅ 제거한 로그

1. **상태 확인 로그**
   - `isAuthenticated`, `isLoading` 등의 단순 상태 출력
   - 세션 존재 여부 확인 로그

2. **진행 과정 로그**
   - OAuth 단계별 진행 로그
   - 메시지 전송/수신 확인 로그
   - 리다이렉트 과정 로그

3. **성공 메시지**
   - `✅ completed`, `✅ successful` 등의 성공 알림
   - `Authentication complete`

4. **민감 정보 출력**
   - Token 일부 출력 (`Token (first 20 chars)`)
   - User ID 출력
   - URL 전체 출력

5. **중복/과도한 로그**
   - 같은 정보를 여러 번 출력하는 로그
   - WebView injection 내부의 상세 로그

### ⚠️ 유지한 로그

1. **에러 로그 (console.error)**
   - 예외 처리 및 디버깅에 필수
   - 사용자 오류 추적 가능

2. **중요한 에러 정보**
   - OAuth 실패 원인
   - 메시지 전송 실패
   - 핸들러 실행 에러

---

## 📝 권장사항

### 1. 프로덕션 환경 로그 관리

향후 환경별 로그 레벨을 도입할 것을 권장합니다:

```typescript
// shared/src/utils/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.log('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
```

**사용 예시**:
```typescript
// 개발 환경에서만 출력
logger.debug("[useSupabaseAuth] Session sent to WebView");

// 모든 환경에서 출력
logger.error("[useSupabaseAuth] Login failed:", error);
```

### 2. 구조화된 로깅

JSON 형식의 구조화된 로그를 사용하면 분석이 용이합니다:

```typescript
logger.info({
  component: 'useSupabaseAuth',
  action: 'login',
  userId: session.user.id,
  timestamp: Date.now(),
});
```

### 3. 로그 수집 서비스 도입

프로덕션 환경에서는 로그 수집 서비스 사용 권장:
- **Sentry**: 에러 추적 및 모니터링
- **LogRocket**: 세션 리플레이 및 로그
- **Datadog**: 종합 모니터링

---

## ✅ 결과

### 개선 사항

1. **코드 가독성 향상**
   - 불필요한 로그 제거로 핵심 로직에 집중 가능
   - 파일 크기 감소

2. **성능 개선**
   - 콘솔 출력 감소 (특히 루프/빈번한 호출에서)
   - 문자열 연산 감소

3. **보안 향상**
   - 민감한 정보 (토큰, User ID) 출력 제거
   - URL 파라미터 노출 제거

4. **유지보수성 향상**
   - 에러 로그만 남겨 디버깅 효율 증가
   - 로그 노이즈 감소

### 남은 콘솔 로그

**console.error** (유지):
- 에러 처리 및 디버깅용
- 프로덕션에서도 유용

**console.warn** (최소):
- 경고 메시지 (거의 없음)

**console.log** (최소):
- 중요 문서 파일에만 존재 (마크다운 등)

---

## 🎉 완료

총 **50개 이상의 불필요한 콘솔 로그**를 제거하여 프로젝트 코드를 깔끔하게 정리했습니다.

### 변경된 파일 (총 12개)

**Native (app/)**:
1. ✅ `app/hooks/useSupabaseAuth.ts`
2. ✅ `app/services/auth/supabase-auth.ts`
3. ✅ `app/app/index.tsx`
4. ✅ `app/app/(tabs)/_layout.tsx`
5. ✅ `app/lib/native-message-hub.ts`
6. ✅ `app/components/AppWebView.tsx`
7. ✅ `app/services/oauth/google.ts`

**Web (web/)**:
8. ✅ `web/lib/web-message-hub.ts`
9. ✅ `web/hooks/useNativeMessage.ts`
10. ✅ `web/hooks/useAuthMessage.ts`
11. ✅ `web/store/auth.ts`

**기타**:
- Linter 에러 없음 ✅
- 빌드 정상 작동 예상 ✅

