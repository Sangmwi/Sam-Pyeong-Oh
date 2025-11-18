# 프로젝트 구조 분석 및 개발 가이드

## 📊 프로젝트 개요

**Sam-Pyeong-Oh (삼평오)** - 하이브리드 모노레포 프로젝트

- **Web**: Next.js 15 + React 19 (WebView UI)
- **App**: Expo SDK 54 + React Native 0.81.5 (Native Container)
- **Shared**: 공통 타입, 스키마, 유틸리티
- **Database**: Supabase (Postgres) + Prisma ORM

---

## 🏗️ 아키텍처 분석

### 현재 구조

```
Sam-Pyeong-Oh/
├── web/              # Next.js 15 웹 애플리케이션
│   ├── app/          # App Router (API Routes 포함)
│   ├── hooks/        # React Hooks
│   ├── lib/          # 유틸리티 및 클라이언트
│   ├── prisma/       # 데이터베이스 스키마
│   └── store/        # Zustand 상태 관리
│
├── app/              # Expo React Native 앱
│   ├── app/          # Expo Router (파일 기반 라우팅)
│   ├── android/      # Android 네이티브 코드
│   └── assets/       # 이미지 및 리소스
│
├── shared/           # 공통 코드 패키지
│   └── src/
│       ├── bridge/   # Native ↔ Web 메시지 브리지
│       ├── schemas/  # Zod 검증 스키마
│       ├── types/    # TypeScript 타입 정의
│       └── utils/    # 공통 유틸리티
│
└── infra/            # 배포 설정 (Vercel)
```

### 모노레포 구조

**워크스페이스 구성:**

- ✅ `web` - npm workspaces에 포함
- ✅ `shared` - npm workspaces에 포함
- ⚠️ `app` - **워크스페이스에서 제외됨** (독립 설치)

**이유:**

- `web`은 React 19 필요
- `app`은 React 19 필요하지만 React Native 0.81.5와 함께 사용
- 버전 충돌 방지를 위해 `app`을 독립적으로 관리

---

## 📦 패키지 관리 전략

### 1. 의존성 설치

#### 전체 설치 (권장)

```bash
# 루트에서 모든 워크스페이스 설치
npm install

# shared 자동 빌드 (postinstall 스크립트)
```

#### 개별 설치

```bash
# Web만 설치
cd web && npm install

# App만 설치 (독립적)
cd app && npm install

# Shared만 설치
cd shared && npm install
```

### 2. Shared 패키지 관리

**현재 설정:**

- `web`: `"@sam-pyeong-oh/shared": "*"` (워크스페이스)
- `app`: `"@sam-pyeong-oh/shared": "file:../shared"` (로컬 경로)

**Shared 변경 시:**

```bash
# 1. Shared 코드 수정
cd shared/src/...

# 2. 빌드 (자동 또는 수동)
npm run build:shared
# 또는
cd shared && npm run build

# 3. Web/App에서 자동 반영 (watch 모드 권장)
cd shared && npm run dev  # watch 모드
```

### 3. 버전 관리

**현재 버전:**

- React: **19.1.0** (Web + App 공통)
- React Native: **0.81.5** (App만)
- Expo SDK: **54.0.24**
- Next.js: **15.1.7**
- TypeScript: **5.9.2**

**업데이트 전략:**

```bash
# Web 패키지 업데이트
cd web
npx npm-check-updates -u
npm install

# App 패키지 업데이트 (Expo 권장)
cd app
npx expo install --fix  # Expo 호환 버전 자동 조정

# Shared 패키지 업데이트
cd shared
npx npm-check-updates -u
npm install
```

---

## 🛠️ 개발 워크플로우

### 1. 초기 설정

```bash
# 1. 저장소 클론
git clone <repository-url>
cd Sam-Pyeong-Oh

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집

# 4. 데이터베이스 설정
cd web
npx prisma generate
npx prisma db push

# 5. 개발 서버 시작
npm run dev:web    # 터미널 1
npm run dev:app    # 터미널 2
```

### 2. 일상적인 개발

#### Web 개발

```bash
# 개발 서버 시작
npm run dev:web
# 또는
cd web && npm run dev

# 타입 체크
cd web && npm run type-check

# 린트
cd web && npm run lint

# 빌드 테스트
cd web && npm run build
```

#### App 개발

```bash
# Metro 번들러 시작
npm run dev:app
# 또는
cd app && npm run start

# Android 실행
cd app && npm run android

# iOS 실행 (macOS만)
cd app && npm run ios

# 빌드 캐시 클리어
cd app && npm run start:dev
```

#### Shared 개발

```bash
# Watch 모드 (자동 빌드)
cd shared && npm run dev

# 일회성 빌드
cd shared && npm run build

# 타입 체크
cd shared && npm run type-check
```

### 3. 코드 공유 전략

**Shared 패키지 사용:**

```typescript
// Web에서
// App에서
import { createAuthTokenMessage, createAuthTokenMessage } from "@sam-pyeong-oh/shared";
```

**Shared에 추가할 것:**

- ✅ 타입 정의 (API DTOs, 메시지 타입)
- ✅ Zod 스키마 (검증)
- ✅ 유틸리티 함수 (인증, 포맷팅)
- ✅ 메시지 브리지 타입

**Shared에 추가하지 말 것:**

- ❌ React 컴포넌트 (Web/App 렌더링 방식 다름)
- ❌ 플랫폼 특화 코드 (Next.js, Expo API)
- ❌ 상태 관리 (Zustand, React Query 등)

---

## 🔧 빌드 및 배포

### 1. 빌드 프로세스

```bash
# 전체 빌드
npm run build:shared  # 1. Shared 빌드
npm run build:web     # 2. Web 빌드
npm run build:app     # 3. App 빌드 (EAS 사용)
```

### 2. 배포 전략

**Web (Vercel):**

```bash
# 자동 배포 (GitHub Actions)
git push origin main

# 수동 배포
cd web
vercel --prod
```

**App (EAS Build):**

```bash
# Android 빌드
cd app
eas build --platform android

# iOS 빌드 (macOS만)
eas build --platform ios

# 프로덕션 빌드
eas build --platform all --profile production
```

---

## ⚠️ 주의사항 및 권장사항

### 1. 패키지 관리

**✅ 권장:**

- 루트에서 `npm install` 실행 (워크스페이스 자동 처리)
- Shared 변경 시 watch 모드 사용
- Expo 패키지는 `npx expo install` 사용

**❌ 피해야 할 것:**

- `app` 폴더를 워크스페이스에 추가 (버전 충돌)
- Shared를 npm 레지스트리에 배포 (로컬 사용)
- Web/App에서 서로 다른 React 버전 사용

### 2. 개발 환경

**필수 도구:**

- Node.js ≥20.0.0
- npm ≥10.0.0
- Android Studio (Android 개발)
- Xcode (iOS 개발, macOS만)
- Expo Go 또는 Dev Client

**환경 변수:**

- `.env.local` - 로컬 개발
- `.env.production` - 프로덕션
- `app/.env` - Expo 환경 변수

### 3. 코드 품질

**자동화된 검사:**

```bash
# 전체 린트
npm run lint

# 전체 타입 체크
npm run type-check

# 포맷팅 검사
npm run format:check

# 포맷팅 적용
npm run format
```

---

## 🚀 성능 최적화

### 1. 빌드 최적화

**Web:**

- Next.js 자동 코드 스플리팅
- `@sam-pyeong-oh/shared` 트랜스파일 최적화 (next.config.js)

**App:**

- Metro 번들러 캐싱
- Hermes 엔진 사용 (기본)
- New Architecture 활성화

### 2. 개발 경험

**Hot Reload:**

- Web: Next.js Fast Refresh (자동)
- App: Expo Fast Refresh (자동)
- Shared: Watch 모드로 자동 재빌드

**디버깅:**

- Web: Chrome DevTools
- App: React Native Debugger, Flipper
- Shared: TypeScript 컴파일러 에러

---

## 📝 체크리스트

### 새 기능 개발 시

- [ ] Shared에 공통 타입/스키마 추가
- [ ] Web/App에서 Shared import 확인
- [ ] 타입 체크 통과 확인
- [ ] 린트 통과 확인
- [ ] 양쪽 플랫폼에서 테스트

### 배포 전

- [ ] 모든 테스트 통과
- [ ] 타입 체크 통과
- [ ] 린트 통과
- [ ] 빌드 성공 확인
- [ ] 환경 변수 설정 확인
- [ ] 데이터베이스 마이그레이션 확인

---

## 🔗 참고 자료

- [Expo SDK 54 문서](https://docs.expo.dev/)
- [Next.js 15 문서](https://nextjs.org/docs)
- [React Native 0.81 문서](https://reactnative.dev/)
- [Prisma 문서](https://www.prisma.io/docs)
- [프로젝트 README](./README.md)
- [메시지 브리지 가이드](./message-bridge-guide.md)

---

**마지막 업데이트:** 2025-01-18
**분석 버전:** 1.0.0
