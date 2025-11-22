# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sam-Pyeong-Oh (삼평오)** is a full-stack TypeScript monorepo combining:
- **Web**: Next.js 15 App Router + Tailwind v4 (WebView UI + API Routes)
- **App**: Expo Dev Client (Native OAuth + WebView Container)
- **Shared**: Common types, schemas, and utilities
- **Database**: Supabase (PostgreSQL) + Prisma ORM

## Development Commands

### Monorepo Root
```bash
# Development
npm run dev:web              # Start Next.js dev server (http://localhost:3000)
npm run dev:app              # Start Expo dev client

# Build
npm run build:web            # Production build for Next.js
npm run build:app            # Build Expo app
npm run build:shared         # Build shared package (auto-runs on postinstall)

# Quality
npm run lint                 # Run linters for all workspaces
npm run type-check           # TypeScript validation for all workspaces
npm run format               # Format all code with Prettier
npm run format:check         # Check formatting without writing

# Cleanup
npm run clean                # Remove all node_modules
```

### Web Workspace (Next.js)
```bash
cd web

# Development
npm run dev                  # Start dev server

# Database
npm run db:generate          # Generate Prisma client
npm run db:push              # Push schema changes without migrations
npm run db:migrate           # Run database migrations (dev)
npm run db:studio            # Open Prisma Studio

# Quality
npm run lint                 # Run ESLint
npm run type-check           # TypeScript validation

# Build
npm run build                # Production build
npm run start                # Start production server
```

### App Workspace (Expo)
```bash
cd app

# Development
npm run start                # Start Expo dev client
npm run start:dev            # Start with cleared cache
npm run android              # Run on Android device/emulator
npm run android:dev          # Run Android debug variant
npm run ios                  # Run on iOS simulator
npm run web                  # Run as web app

# Build (requires EAS CLI: npm install -g eas-cli)
eas build --platform android # Build Android APK/AAB
eas build --platform ios     # Build iOS app
eas build --platform all     # Build both platforms
```

### Shared Workspace
```bash
cd shared

npm run build                # Build TypeScript types
npm run dev                  # Watch mode for development
npm run type-check           # Validate types
npm run clean                # Remove dist folder
```

## Architecture

### Monorepo Structure
```
Sam-Pyeong-Oh/
├── web/                     # Next.js 15 application
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes (threads)
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── lib/                # Core utilities
│   │   ├── supabase/       # Supabase clients
│   │   │   ├── client.ts   # Browser client
│   │   │   └── server.ts   # Server client (SSR)
│   │   ├── api-client.ts   # Fetch wrapper with auto-auth
│   │   ├── auth-middleware.ts # Supabase token verification
│   │   ├── db.ts           # Prisma client
│   │   └── message-bridge.ts # WebView communication
│   ├── store/              # Zustand stores
│   │   └── auth.ts         # Auth state (memory-only)
│   ├── hooks/              # React hooks
│   └── prisma/             # Database schema (app data only)
│
├── app/                     # Expo application
│   ├── app/                # Expo Router
│   │   ├── _layout.tsx     # Root layout
│   │   └── index.tsx       # Auth gate + WebView
│   ├── lib/                # Core utilities
│   │   └── supabase.ts     # Supabase client (React Native)
│   ├── services/           # Business logic
│   │   └── auth/
│   │       └── supabase-auth.ts # Supabase Auth service
│   ├── hooks/              # React hooks
│   │   └── useSupabaseAuth.ts # Auth state + WebView bridge
│   └── app.json            # Expo configuration
│
└── shared/                  # Shared code
    └── src/
        ├── bridge/         # Message types (Native ↔ Web)
        ├── types/          # API DTOs
        ├── schemas/        # Zod validation
        └── utils/          # Common utilities
```

### Authentication Flow

**Critical**: This project uses **Supabase Auth** with a **Native OAuth → WebView Bridge → Memory Store** pattern:

1. **Native Side (Expo)**:
   - User taps "Google로 계속하기" → Supabase Auth Google OAuth flow
   - Supabase session stored in `expo-secure-store` (via custom storage adapter)
   - Access token sent to WebView via `postMessage()`
   - Session auto-refresh handled by Supabase client

2. **Web Side (Next.js)**:
   - `messageBridge` listens for native messages
   - Supabase access token stored in Zustand (memory-only, no localStorage)
   - `apiClient` auto-attaches `Authorization: Bearer ${token}` header
   - API routes verify token via Supabase `auth.getUser(token)`

3. **Message Bridge System**:
   - **Native → Web**: `AUTH_TOKEN`, `AUTH_ERROR`, `LOGOUT_SUCCESS`
   - **Web → Native**: `REQUEST_LOGOUT`, `TOKEN_REFRESH_REQUEST`
   - All types defined in `@shared/bridge/messages.ts`
   - **MVP Note**: Google OAuth only (Kakao support removed)

4. **User Management**:
   - User accounts managed in Supabase Auth (`auth.users` table)
   - Prisma manages only app data (`Thread`, `Message` models)
   - Threads/Messages reference `userId` (UUID from Supabase Auth)
   - No local User model in Prisma schema

### Message Bridge Architecture

The `messageBridge` (singleton in `web/lib/message-bridge.ts`) is a **type-safe event system**:

```typescript
// Register handler for specific message type
messageBridge.on(NativeToWebMessageType.AUTH_TOKEN, (message) => {
  useAuthStore.getState().setAuth(message.payload);
});

// Register global handler for all messages
messageBridge.onAll((message) => {
  console.log('Message received:', message);
});

// Initialize (must be called once)
messageBridge.initialize();

// Cleanup (on unmount)
messageBridge.destroy();
```

**Key Points**:
- Handlers return cleanup functions (for React useEffect)
- Supports multiple handlers per message type
- Safe error handling per handler
- Global + type-specific handlers

### API Client Pattern

The `apiClient` (singleton in `web/lib/api-client.ts`) automatically:
- Attaches Supabase access token from Zustand auth store
- Handles API response format: `{ success: boolean, data?: T, error?: { message: string } }`
- Throws on error for easy try/catch usage

```typescript
// Automatic auth header injection (Supabase token)
const threads = await apiClient.get<Thread[]>('/api/threads');

// Skip auth for public endpoints
const data = await apiClient.post('/api/public', body, { skipAuth: true });
```

### Database Schema

Prisma schema (`web/prisma/schema.prisma`) manages **app data only** (authentication handled by Supabase):

- **Thread**: Conversation threads with `userId` (references `auth.users.id` from Supabase)
- **Message**: Chat messages with roles (many-to-one with Thread)

**Important**: User authentication is managed by Supabase Auth (`auth.users` table). Prisma only manages application data (threads and messages). All thread/message records reference the Supabase user ID (UUID).

### Supabase Setup

This project requires a Supabase project with Google OAuth configured.

**1. Create Supabase Project**:
- Go to [supabase.com](https://supabase.com) and create a new project
- Note your project URL and anon key from Settings → API
- Get your database connection strings from Settings → Database

**2. Configure Google OAuth**:
- Go to Authentication → Providers → Google
- Enable the Google provider
- Add your Google OAuth credentials (from Google Cloud Console)
- Add authorized redirect URLs:
  - For development: `sampyeongoh://auth/callback`
  - For production: Your published app's deep link scheme

**3. Database Setup** (optional, for RLS):
```sql
-- Enable RLS on threads table
ALTER TABLE "Thread" ENABLE ROW LEVEL SECURITY;

-- Users can only see their own threads
CREATE POLICY "Users can view own threads" ON "Thread"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Users can only create their own threads
CREATE POLICY "Users can create own threads" ON "Thread"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Similar policies for Message table
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON "Message"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Thread"
      WHERE "Thread"."id" = "Message"."threadId"
      AND "Thread"."userId" = auth.uid()::text
    )
  );
```

**4. Environment Variables**:
- Copy values from Supabase dashboard to `.env.local` (web) and `.env` (app)
- See section "4. Environment Variables" below for full configuration

## Critical Patterns

### 1. TypeScript Path Aliases
```typescript
// Configured in tsconfig.base.json
import { ... } from '@web/...'     // Web workspace
import { ... } from '@app/...'     // App workspace
import { ... } from '@shared/...'  // Shared workspace
```

### 2. Shared Package Changes
After modifying `@shared`:
```bash
npm run build:shared    # Must rebuild
# Or use watch mode: cd shared && npm run dev
```

### 3. Prisma Workflow
```bash
# 1. Edit schema
vim web/prisma/schema.prisma

# 2. Generate client
npm --prefix web run db:generate

# 3. Apply changes
npm --prefix web run db:migrate  # or db:push for prototyping
```

### 4. Environment Variables

**Web** (`.env.local`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # For admin operations (optional)

# Database (from Supabase Dashboard)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Optional
NEXT_PUBLIC_WEB_URL=http://localhost:3000  # For CORS/WebView
```

**App** (`.env` or Expo env):
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# WebView target URL
EXPO_PUBLIC_WEB_URL=http://localhost:3000
                     # Android emulator: http://10.0.2.2:3000
                     # iOS simulator: http://localhost:3000
                     # Physical device: http://<YOUR_IP>:3000
```

### 5. WebView Connection Debugging

If Expo app shows "WebView 연결 오류":
1. Ensure Next.js dev server is running (`npm run dev:web`)
2. Check `EXPO_PUBLIC_WEB_URL` matches your environment
3. Android emulator: Use `http://10.0.2.2:3000`
4. Physical device: Use your computer's local IP (e.g., `http://192.168.1.100:3000`)

## Code Conventions

### Imports Organization
Prettier automatically organizes imports via `@ianvs/prettier-plugin-sort-imports`:
1. React/Next.js/Expo core imports
2. Third-party packages
3. Workspace imports (`@web`, `@app`, `@shared`)
4. Relative imports
5. Type imports (separated)

### TypeScript
- **Strict mode** enabled across all workspaces
- Use `type` for type-only imports
- Prefer `interface` over `type` for object shapes
- Use Zod schemas in `@shared/schemas` for runtime validation

### React Patterns
- Prefer Server Components (Next.js) unless client interactivity needed
- Use `"use client"` directive only when necessary
- Hooks must follow React rules (no conditional calls)
- Zustand for global state, React Query for server state

### Naming
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- API routes: lowercase with hyphens (e.g., `api/auth/verify`)

## Known Patterns & Idioms

### Message Bridge Registration in React
```typescript
useEffect(() => {
  const cleanup = messageBridge.on(
    NativeToWebMessageType.AUTH_TOKEN,
    (message) => {
      // Handle message
    }
  );

  return cleanup; // Auto-cleanup on unmount
}, []);
```

### API Route Structure (Supabase Auth)
```typescript
// web/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // Verify Supabase token and get user info
    const user = await requireAuth(request);
    // user.userId and user.email available

    return NextResponse.json({
      success: true,
      data: { userId: user.userId }
    });
  } catch (error) {
    // requireAuth throws 401 Response if not authenticated
    return error as Response;
  }
}
```

### Shared Type Usage
Types in `@shared` are **source of truth** for both web and app:
```typescript
// @shared/types/api.ts
export interface APIResponse<T = unknown> {
  success: boolean;
  data: T;
  error: { message: string };
}

// Used in both web (API routes) and app (TypeScript typing)
```

## Tech Stack Reference

- **Frontend**: React 19, Next.js 15, Tailwind v4
- **Mobile**: Expo 52, React Native 0.76, Expo Router 6
- **Backend**: Next.js API Routes, Prisma 6, Supabase
- **State**: Zustand 5, React Query 5
- **Validation**: Zod 3
- **Auth**: Supabase Auth (@supabase/supabase-js, @supabase/ssr), expo-secure-store
- **Build**: TypeScript 5.7, npm workspaces

## Prerequisites

- Node.js ≥20.0.0
- npm ≥10.0.0
- For mobile development: Expo CLI, EAS CLI (`npm install -g expo-cli eas-cli`)
- For database: Supabase account and connection string
