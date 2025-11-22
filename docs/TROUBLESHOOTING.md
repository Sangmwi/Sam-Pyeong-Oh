# Sam-Pyeong-Oh 트러블슈팅 가이드

실제 개발 중 겪은 문제들과 해결 방법을 정리한 문서입니다.

---

## 📋 목차

1. [React 무한 리렌더링](#react-무한-리렌더링)
2. [Buffer is not defined](#buffer-is-not-defined)
3. [WebView 메시지 전송 실패](#webview-메시지-전송-실패)
4. [Prisma 타입 오류](#prisma-타입-오류)
5. [Android Emulator 연결 문제](#android-emulator-연결-문제)
6. [Supabase OAuth 설정 오류](#supabase-oauth-설정-오류)
7. [TypeScript 경로 별칭 오류](#typescript-경로-별칭-오류)
8. [Expo 빌드 오류](#expo-빌드-오류)

---

## React 무한 리렌더링

### 증상

```
ERROR: Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

앱이 멈추고 화면이 흰색으로 변함

### 원인 #1: Hook Body에서 직접 실행되는 코드

```typescript
// ❌ 잘못된 코드
export function useAuthMessage() {
  console.log("This runs on every render!"); // 💥 매번 실행

  const { sendMessage } = useNativeMessage();

  useEffect(() => {
    sendMessage(createWebAppReadyMessage());
  }, [sendMessage]);
}
```

**왜 문제인가?**
- Hook 함수 body는 컴포넌트가 렌더링될 때마다 실행됨
- `console.log`가 매번 실행되어 리렌더 트리거

**해결책**:
```typescript
// ✅ 올바른 코드
export function useAuthMessage() {
  const { sendMessage } = useNativeMessage();

  useEffect(() => {
    console.log("This runs once on mount"); // ✅ useEffect 안에서
    sendMessage(createWebAppReadyMessage());
  }, [sendMessage]);
}
```

### 원인 #2: 의존성 배열의 불안정한 함수

```typescript
// ❌ 잘못된 코드
export function useNativeMessage() {
  // 매번 새 함수 생성 💥
  const sendMessage = (message: WebToNativeMessage) => {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  };

  return { sendMessage };
}

export function useAuthMessage() {
  const { sendMessage } = useNativeMessage();

  useEffect(() => {
    sendMessage(createWebAppReadyMessage());
  }, [sendMessage]); // sendMessage가 매번 바뀌어서 무한 루프 💥
}
```

**해결책**:
```typescript
// ✅ 올바른 코드
export function useNativeMessage() {
  const sendMessage = useCallback((message: WebToNativeMessage) => {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  }, []); // 빈 의존성 배열 - 함수 재생성 방지

  return { sendMessage };
}
```

### 디버깅 방법

1. **React DevTools Profiler 사용**
   ```bash
   # Chrome Extension 설치
   # React DevTools → Profiler 탭 → Record
   ```

2. **의존성 배열 확인**
   ```typescript
   useEffect(() => {
     console.log("Effect running, deps:", { sendMessage });
   }, [sendMessage]);
   ```

3. **ESLint Rule 활성화**
   ```json
   // .eslintrc.json
   {
     "rules": {
       "react-hooks/exhaustive-deps": "error"
     }
   }
   ```

---

## Buffer is not defined

### 증상

```
ERROR: [ReferenceError: Property 'Buffer' doesn't exist]

Call Stack:
  WebViewBridge#sendMessage (utils\webview-bridge.ts)
```

### 원인

Node.js의 `Buffer` API는 React Native 환경에 존재하지 않음

```typescript
// ❌ Node.js 전용 API
const base64 = Buffer.from(serialized).toString('base64');
```

### 해결책

브라우저 호환 API (`btoa`, `atob`) 사용:

```typescript
// ✅ 브라우저/React Native 호환
const base64Message = btoa(unescape(encodeURIComponent(serialized)));

// WebView에서 디코딩
const decoded = decodeURIComponent(escape(atob(base64Message)));
```

**왜 이렇게 복잡한가?**
- `btoa`/`atob`는 ASCII만 지원
- UTF-8 문자(한글 등) 처리를 위해 `encodeURIComponent` + `unescape` 사용

### 대안: react-native-base64

```bash
npm install react-native-base64
```

```typescript
import base64 from 'react-native-base64';

const encoded = base64.encode(serialized);
const decoded = base64.decode(encoded);
```

---

## WebView 메시지 전송 실패

### 증상

**Native 로그**:
```
[WebViewBridge] Attempting to send: AUTH_TOKEN
[WebViewBridge] webViewRef exists: true
[WebViewBridge] Message injected: AUTH_TOKEN
```

**Web 로그**:
```
(아무것도 없음)
```

메시지가 WebView에 도달하지 않음

### 원인 #1: 템플릿 리터럴 이스케이프 문제

```typescript
// ❌ 특수문자 때문에 JavaScript 구문 오류 발생
const jsCode = `
  var messageStr = ${JSON.stringify(serialized)}; // 💥
  window.postMessage(messageStr, '*');
`;
```

**문제되는 JSON 예시**:
```json
{
  "type": "AUTH_TOKEN",
  "payload": {
    "token": "eyJhbGci...\"quote\"...newline\n"
  }
}
```

따옴표, 백슬래시, 줄바꿈 등이 템플릿 리터럴 구문을 깨뜨림

### 해결책: Base64 인코딩

```typescript
// ✅ Base64로 안전하게 전송
const serialized = JSON.stringify(message);
const base64Message = btoa(unescape(encodeURIComponent(serialized)));

const jsCode = `
  (function() {
    try {
      var base64Str = '${base64Message}'; // 안전한 문자열
      var messageStr = decodeURIComponent(escape(atob(base64Str)));

      window.postMessage(messageStr, '*');
      console.log('[WebViewBridge] Message sent');
    } catch (err) {
      console.error('[WebViewBridge] Error:', err.message, err.stack);
    }
  })();
  true;
`;

webViewRef.current.injectJavaScript(jsCode);
```

### 원인 #2: 이중 JSON.stringify

```typescript
// ❌ 두 번 stringify하면 이스케이프가 꼬임
const serialized = JSON.stringify(message);
const jsCode = `
  var messageStr = ${JSON.stringify(serialized)}; // 💥 이중 인코딩
`;
```

**결과**:
```javascript
var messageStr = "{\"type\":\"AUTH_TOKEN\",\"payload\":{...}}"; // 문자열 안에 문자열
```

### 디버깅 방법

1. **Chrome DevTools로 WebView 연결**
   - Android: `chrome://inspect`
   - iOS: Safari → Develop → Simulator

2. **Injected Code에 로그 추가**
   ```typescript
   const jsCode = `
     (function() {
       console.log('[DEBUG] Starting injection');
       console.log('[DEBUG] Base64:', '${base64Message}'.substring(0, 50));
       // ... 나머지 코드
     })();
   `;
   ```

3. **WebView에서 에러 확인**
   ```typescript
   <WebView
     onError={(syntheticEvent) => {
       console.error('WebView error:', syntheticEvent.nativeEvent);
     }}
   />
   ```

---

## Prisma 타입 오류

### 증상

```typescript
Type 'Session' is not assignable to type 'AuthResult["session"]'
  Property 'expires_at' is required in type 'AuthResult["session"]' but optional in type 'Session'
```

### 원인

Supabase의 `Session` 타입과 커스텀 `AuthResult` 타입 불일치:

```typescript
// Supabase Session
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;    // optional
  user: {
    id: string;
    email?: string;       // optional
  };
}

// ❌ 커스텀 타입이 더 엄격함
interface AuthResult {
  session: {
    expires_at: number;   // required 💥
    user: {
      email: string;      // required 💥
    };
  };
}
```

### 해결책

커스텀 타입을 Supabase 타입에 맞춤:

```typescript
// ✅ Supabase Session과 동일하게
export interface AuthResult {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;      // optional
    user: {
      id: string;
      email?: string;         // optional
      user_metadata: {
        name?: string;
        avatar_url?: string;
      };
    };
  };
}
```

### 대안: Supabase 타입 직접 사용

```typescript
import type { Session } from '@supabase/supabase-js';

export interface AuthResult {
  session: Session; // Supabase 타입 그대로 사용
}
```

---

## Android Emulator 연결 문제

### 증상

WebView가 로드되지 않거나 "연결 오류" 표시

### 원인

Android Emulator에서 `localhost`는 에뮬레이터 자신을 가리킴 (호스트 머신 아님)

```bash
# ❌ 작동 안 함
EXPO_PUBLIC_WEB_URL=http://localhost:3000
```

### 해결책 #1: 특수 IP 사용

```bash
# ✅ Android Emulator 전용 IP
EXPO_PUBLIC_WEB_URL=http://10.0.2.2:3000
```

`10.0.2.2`는 Android Emulator에서 호스트 머신을 가리키는 특수 IP

### 해결책 #2: 로컬 네트워크 IP 사용

```bash
# Windows
ipconfig

# Mac/Linux
ifconfig

# 로컬 IP 확인 (예: 192.168.0.5)
EXPO_PUBLIC_WEB_URL=http://192.168.0.5:3000
```

**장점**: 실제 디바이스에서도 동작

### 플랫폼별 설정

```typescript
// app/config/webview.ts
import { Platform } from 'react-native';

export const getWebViewUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL;

  if (__DEV__) {
    if (Platform.OS === 'android') {
      return baseUrl.replace('localhost', '10.0.2.2');
    }
  }

  return baseUrl;
};
```

---

## Supabase OAuth 설정 오류

### 증상 #1: "Invalid domain"

```
잘못된 도메인: 스키마(http:// 또는 https://)를 지정해서는 안 됩니다.
```

### 원인

Google Cloud Console의 **Authorized JavaScript origins**에 `http://` 포함

### 해결책

```bash
# ❌ 잘못된 입력
http://localhost:3000

# ✅ 올바른 입력
localhost:3000
```

### 증상 #2: "Redirect URI mismatch"

```
Error 400: redirect_uri_mismatch
```

### 원인

Google Cloud Console과 Supabase의 Redirect URL 불일치

### 해결책

**Google Cloud Console**:
```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

**Supabase Dashboard**:
- Authentication → URL Configuration → Redirect URLs에 자동 입력됨
- 추가 URL 필요 시 여기에 추가

### 증상 #3: "Invalid redirect scheme"

Kakao OAuth 사용 시:
```
올바르지 않은 리디렉션: 공개 최상위 도메인(예: .com, .org)으로 끝나야 합니다.
```

### 원인

Kakao는 커스텀 URL 스킴(`sampyeongoh://`) 허용 안 함

### 해결책

Google OAuth만 사용 (MVP 단계에서는 충분)

```typescript
// ❌ Kakao 제거
// signInWithKakao()

// ✅ Google만 사용
signInWithGoogle()
```

---

## TypeScript 경로 별칭 오류

### 증상

```typescript
Cannot find module '@sam-pyeong-oh/shared' or its corresponding type declarations.
```

### 원인 #1: tsconfig paths 미설정

### 해결책

`tsconfig.base.json` (루트):
```json
{
  "compilerOptions": {
    "paths": {
      "@web/*": ["./web/*"],
      "@app/*": ["./app/*"],
      "@sam-pyeong-oh/shared": ["./shared/src/index.ts"]
    }
  }
}
```

각 워크스페이스의 `tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json"
}
```

### 원인 #2: Shared 패키지 미빌드

### 해결책

```bash
# Shared 패키지 빌드
npm run build:shared

# 또는 watch 모드
cd shared && npm run dev
```

### 원인 #3: Node Module Resolution 문제

`package.json` 확인:
```json
{
  "workspaces": [
    "web",
    "app",
    "shared"
  ]
}
```

`shared/package.json`:
```json
{
  "name": "@sam-pyeong-oh/shared",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

---

## Expo 빌드 오류

### 증상 #1: Metro bundler 캐시 문제

```
Error: Unable to resolve module ...
```

### 해결책

```bash
# 캐시 삭제 후 재시작
npx expo start --clear

# 또는 watchman 캐시 삭제 (Mac)
watchman watch-del-all
```

### 증상 #2: "Invariant Violation: requireNativeComponent"

```
Invariant Violation: requireNativeComponent: "RNCWebView" was not found in the UIManager.
```

### 원인

네이티브 모듈이 제대로 링크되지 않음

### 해결책

```bash
# iOS
cd ios && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..

# Expo 재시작
npx expo start --clear
```

### 증상 #3: TypeScript 버전 충돌

```
error TS2307: Cannot find module '@react-navigation/native'
```

### 해결책

```bash
# 의존성 호환성 체크
npx expo install --fix

# 또는 TypeScript 버전 맞추기
npm install typescript@5.7.2 --save-dev
```

---

## 일반적인 디버깅 전략

### 1. 로그 레벨 증가

```typescript
// 개발 환경에서만 상세 로그
const DEBUG = __DEV__;

if (DEBUG) {
  console.log('[DEBUG] Message:', message);
  console.log('[DEBUG] State:', state);
}
```

### 2. 에러 바운더리 추가

```typescript
// web/app/error.tsx (Next.js)
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <pre>{error.message}</pre>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 3. React DevTools 활용

- Component tree 확인
- Props/State 실시간 수정
- Profiler로 성능 분석

### 4. Network 탭 확인

- API 요청/응답 확인
- 헤더 검증 (Authorization 등)
- 에러 상태 코드 확인

### 5. Supabase 로그 확인

Dashboard → Logs:
- Auth logs: 로그인 시도, 토큰 발급
- API logs: API 요청, 에러
- Database logs: SQL 쿼리, 성능

---

## 추가 도움말

### 공식 문서
- [Next.js Troubleshooting](https://nextjs.org/docs/messages)
- [Expo Troubleshooting](https://docs.expo.dev/troubleshooting/)
- [Supabase Troubleshooting](https://supabase.com/docs/guides/platform/troubleshooting)

### 커뮤니티
- [Expo Discord](https://chat.expo.dev/)
- [Supabase Discord](https://discord.supabase.com/)
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)

---

**마지막 업데이트**: 2025-01-23
