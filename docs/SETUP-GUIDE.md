# Sam-Pyeong-Oh 프로젝트 설치 가이드

완전히 처음부터 프로젝트를 설정하는 단계별 가이드입니다.

## 📋 사전 요구사항

### 필수 소프트웨어
- **Node.js**: ≥20.0.0 ([nodejs.org](https://nodejs.org))
- **npm**: ≥10.0.0 (Node.js와 함께 설치됨)
- **Git**: 최신 버전
- **Android Studio** 또는 **Xcode** (모바일 개발용)

### 계정
- **Supabase 계정** ([supabase.com](https://supabase.com))
- **Google Cloud Console 계정** ([console.cloud.google.com](https://console.cloud.google.com))
- **Expo 계정** ([expo.dev](https://expo.dev))

---

## Step 1: 프로젝트 생성

### 1.1. 새 디렉토리 생성

```bash
mkdir Sam-Pyeong-Oh
cd Sam-Pyeong-Oh
```

### 1.2. Git 초기화

```bash
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "*.log" >> .gitignore
```

### 1.3. Package.json 생성

```bash
npm init -y
```

`package.json` 수정:
```json
{
  "name": "sam-pyeong-oh",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "web",
    "app",
    "shared"
  ],
  "scripts": {
    "dev:web": "npm --prefix web run dev",
    "dev:app": "npm --prefix app run start",
    "build:web": "npm --prefix web run build",
    "build:app": "npm --prefix app run build",
    "build:shared": "npm --prefix shared run build",
    "lint": "npm --prefix web run lint && npm --prefix app run lint",
    "type-check": "npm --prefix web run type-check && npm --prefix app run type-check && npm --prefix shared run type-check",
    "clean": "rm -rf node_modules web/node_modules app/node_modules shared/node_modules"
  }
}
```

---

## Step 2: Shared Workspace 생성

### 2.1. 디렉토리 구조

```bash
mkdir -p shared/src/bridge
mkdir -p shared/src/types
mkdir -p shared/src/schemas
mkdir -p shared/src/utils
```

### 2.2. Package.json

`shared/package.json`:
```json
{
  "name": "@sam-pyeong-oh/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

### 2.3. TypeScript 설정

`shared/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.4. 메시지 타입 정의

`shared/src/bridge/messages.ts`:
```typescript
// Native → Web 메시지
export enum NativeToWebMessageType {
  AUTH_TOKEN = 'AUTH_TOKEN',
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
  AUTH_ERROR = 'AUTH_ERROR',
}

export interface AuthTokenMessage {
  type: NativeToWebMessageType.AUTH_TOKEN;
  payload: {
    token: string;
    userId: string;
    expiresAt: number;
    provider: 'google';
  };
}

export interface LogoutSuccessMessage {
  type: NativeToWebMessageType.LOGOUT_SUCCESS;
  payload: {};
}

export interface AuthErrorMessage {
  type: NativeToWebMessageType.AUTH_ERROR;
  payload: {
    error: string;
  };
}

export type NativeToWebMessage =
  | AuthTokenMessage
  | LogoutSuccessMessage
  | AuthErrorMessage;

// Web → Native 메시지
export enum WebToNativeMessageType {
  WEB_APP_READY = 'WEB_APP_READY',
  REQUEST_LOGOUT = 'REQUEST_LOGOUT',
}

export interface WebAppReadyMessage {
  type: WebToNativeMessageType.WEB_APP_READY;
  payload: {};
}

export interface RequestLogoutMessage {
  type: WebToNativeMessageType.REQUEST_LOGOUT;
  payload: {};
}

export type WebToNativeMessage = WebAppReadyMessage | RequestLogoutMessage;

// Helper functions
export function createAuthTokenMessage(
  token: string,
  userId: string,
  expiresAt: number,
  provider: 'google'
): AuthTokenMessage {
  return {
    type: NativeToWebMessageType.AUTH_TOKEN,
    payload: { token, userId, expiresAt, provider },
  };
}

export function createWebAppReadyMessage(): WebAppReadyMessage {
  return {
    type: WebToNativeMessageType.WEB_APP_READY,
    payload: {},
  };
}

export function createLogoutSuccessMessage(): LogoutSuccessMessage {
  return {
    type: NativeToWebMessageType.LOGOUT_SUCCESS,
    payload: {},
  };
}
```

### 2.5. Export

`shared/src/index.ts`:
```typescript
export * from './bridge/messages';
export * from './types/api';
export * from './schemas/thread';
export * from './utils/common';
```

### 2.6. 빌드

```bash
cd shared
npm install
npm run build
cd ..
```

---

## Step 3: Supabase 설정

### 3.1. 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. Organization 선택 (없으면 생성)
4. 프로젝트 이름: `sam-pyeong-oh`
5. Database Password 설정 (저장 필수!)
6. Region: 가까운 지역 선택 (예: Northeast Asia)
7. "Create new project" 클릭

### 3.2. API 정보 확인

프로젝트 생성 후:

1. **Settings → API**로 이동
2. 다음 정보 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...`

3. **Settings → Database**로 이동
4. **Connection String** 섹션에서:
   - **Pooling connection** 복사 (DATABASE_URL용)
   - **Direct connection** 복사 (DIRECT_URL용)
   - `[YOUR-PASSWORD]`를 실제 비밀번호로 교체

### 3.3. Google OAuth 설정

#### Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `SamPyeongOh`
3. **APIs & Services → OAuth consent screen**:
   - User Type: External
   - App name: `Sam-Pyeong-Oh`
   - Support email: 본인 이메일
   - Developer contact: 본인 이메일
4. **Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - Application type: Web application
   - Name: `SamPyeongOh Web Client`
   - Authorized redirect URIs:
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
     (YOUR-PROJECT-REF는 Supabase Project URL에서 확인)
5. **Client ID**와 **Client Secret** 복사

#### Supabase Dashboard

1. **Authentication → Providers → Google** 이동
2. **Enable** 체크박스 활성화
3. Google Cloud Console에서 복사한 정보 입력:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxx`
4. **Save** 클릭

---

## Step 4: Web Workspace 생성

### 4.1. Next.js 프로젝트 생성

```bash
npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

선택사항:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Turbopack: Yes
- Import alias: `@/*`

### 4.2. 의존성 설치

```bash
cd web
npm install @supabase/supabase-js @supabase/ssr
npm install prisma @prisma/client
npm install zustand zod
npm install --save-dev @types/node
cd ..
```

### 4.3. Prisma 초기화

```bash
cd web
npx prisma init
```

`web/prisma/schema.prisma` 수정:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Thread {
  id        String    @id @default(uuid())
  userId    String    // Supabase auth.users.id 참조
  title     String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id        String   @id @default(uuid())
  threadId  String
  thread    Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  role      String   // "user" | "assistant" | "system"
  content   String
  createdAt DateTime @default(now())
}
```

### 4.4. 환경 변수 설정

`web/.env.local` 생성:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Database
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Optional
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

### 4.5. Prisma 생성 및 마이그레이션

```bash
npm run db:generate
npm run db:push
```

`web/package.json`에 스크립트 추가:
```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  }
}
```

---

## Step 5: App Workspace 생성

### 5.1. Expo 프로젝트 생성

```bash
npx create-expo-app app --template blank-typescript
```

### 5.2. 의존성 설치

```bash
cd app
npx expo install expo-router expo-secure-store expo-auth-session expo-web-browser
npx expo install react-native-webview
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
cd ..
```

### 5.3. 환경 변수 설정

`app/.env` 생성:
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# WebView URL
EXPO_PUBLIC_WEB_URL=http://localhost:3000
# Android emulator: http://10.0.2.2:3000
# iOS simulator: http://localhost:3000
# Physical device: http://<YOUR_IP>:3000 (ifconfig 또는 ipconfig로 확인)
```

### 5.4. App.json 설정

`app/app.json`:
```json
{
  "expo": {
    "name": "Sam-Pyeong-Oh",
    "slug": "sam-pyeong-oh",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "sampyeongoh",
    "platforms": ["ios", "android"],
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sampyeongoh.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.sampyeongoh.app"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

---

## Step 6: 핵심 파일 생성

### 6.1. Web: Supabase 클라이언트

`web/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 6.2. Web: Message Bridge

`web/lib/message-bridge.ts`:
```typescript
import type { NativeToWebMessage } from '@sam-pyeong-oh/shared';

type MessageHandler<T extends NativeToWebMessage = NativeToWebMessage> = (
  message: T
) => void | Promise<void>;

class MessageBridge {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private messageListener: ((event: MessageEvent) => void) | null = null;

  initialize(): void {
    if (this.messageListener) return;

    this.messageListener = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as NativeToWebMessage;
        this.handleMessage(message);
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  on<T extends NativeToWebMessage>(
    type: T['type'],
    handler: MessageHandler<T>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);

    return () => {
      this.handlers.get(type)?.delete(handler as MessageHandler);
    };
  }

  private handleMessage(message: NativeToWebMessage): void {
    const typeHandlers = this.handlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[MessageBridge] Handler error:`, error);
        }
      });
    }
  }

  destroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    this.handlers.clear();
  }
}

export const messageBridge = new MessageBridge();
```

### 6.3. App: Supabase 클라이언트

`app/lib/supabase.ts`:
```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 6.4. App: WebView Bridge

`app/utils/webview-bridge.ts`:
```typescript
import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import type { NativeToWebMessage } from '@sam-pyeong-oh/shared';

class WebViewBridge {
  private webViewRef: RefObject<WebView | null> | null = null;

  initialize(webViewRef: RefObject<WebView | null>): void {
    this.webViewRef = webViewRef;
  }

  sendMessage(message: NativeToWebMessage): void {
    if (!this.webViewRef?.current) {
      console.warn('[WebViewBridge] WebView ref not available');
      return;
    }

    const serialized = JSON.stringify(message);
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

export const webViewBridge = new WebViewBridge();
```

---

## Step 7: 프로젝트 실행

### 7.1. 의존성 설치

```bash
# 루트에서
npm install

# Shared 빌드
npm run build:shared
```

### 7.2. Web 서버 실행

```bash
# 터미널 1
npm run dev:web
```

브라우저에서 `http://localhost:3000` 확인

### 7.3. App 서버 실행

```bash
# 터미널 2
npm run dev:app
```

QR 코드 스캔 또는 에뮬레이터 실행

---

## Step 8: 테스트

### 8.1. Web에서 브라우저 테스트

1. `http://localhost:3000` 접속
2. 개발자 도구 콘솔 확인
3. "ReactNativeWebView not available" 경고 정상 (Native 환경 아님)

### 8.2. Native 앱 테스트

1. Expo Go 앱에서 QR 코드 스캔
2. "Google로 계속하기" 버튼 클릭
3. Google 로그인 완료
4. WebView에 토큰 전달 확인

### 8.3. 디버깅

**Chrome DevTools로 WebView 디버깅**:
1. Android: `chrome://inspect`
2. iOS: Safari → Develop → Simulator

---

## 문제 해결

### 의존성 설치 오류

```bash
# 전체 clean 후 재설치
npm run clean
npm install
npm run build:shared
```

### Prisma 오류

```bash
cd web
npx prisma generate
npx prisma db push
```

### Expo 오류

```bash
cd app
npx expo install --fix
npx expo start --clear
```

### WebView 연결 안 됨

- Android Emulator: `EXPO_PUBLIC_WEB_URL=http://10.0.2.2:3000`
- Physical Device: 로컬 IP 확인 (`ifconfig` 또는 `ipconfig`)

---

**다음 단계**: [PROJECT-HANDOFF.md](./PROJECT-HANDOFF.md)의 "인증 플로우" 섹션 참조
