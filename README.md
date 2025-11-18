# Sam-Pyeong-Oh (삼평오)

> Next.js 15 + Tailwind v4 + Expo Dev Client + Supabase Monorepo

## 🏗️ Architecture

- **Web**: Next.js 15 App Router + Tailwind v4 (WebView UI + API Routes)
- **App**: Expo Dev Client (Native OAuth + WebView Container)
- **Shared**: Common types, schemas, utilities
- **Database**: Supabase (Postgres) + Prisma ORM
- **Deployment**: Vercel (Web) + EAS (Mobile)

## 📦 Monorepo Structure

```
Sam-Pyeong-Oh/
├── web/          # Next.js 15 + Tailwind v4
├── app/          # Expo Dev Client
├── shared/       # Common code
└── infra/        # CI/CD + Infrastructure
```

## 🚀 Quick Start

### Prerequisites

- Node.js ≥20.0.0
- npm ≥10.0.0
- Expo CLI: `npm install -g expo-cli eas-cli`

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/Sam-Pyeong-Oh.git
cd Sam-Pyeong-Oh

# Install dependencies (all workspaces)
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your actual credentials

# Run database migrations
cd web && npx prisma migrate dev

# Start development servers
npm run dev:web    # Next.js dev server (http://localhost:3000)
npm run dev:app    # Expo dev client
```

## 🔧 Development

### Web (Next.js)

```bash
cd web
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### App (Expo)

```bash
cd app
npm run start        # Start Expo dev client
npm run android      # Run on Android
npm run ios          # Run on iOS
eas build --platform android  # Build APK/AAB
```

### Shared

```bash
cd shared
npm run build        # Build types and utilities
npm run type-check   # TypeScript validation
```

## 🌐 Deployment

### Web (Vercel)

- Push to `main` branch → Auto-deploy via GitHub Actions
- Manual: `vercel --prod`

### App (EAS)

- Push to `main` branch → Auto-build via GitHub Actions
- Manual: `eas build --platform all`

## 🔐 Authentication Flow

1. **App**: User taps "Login with Google/Kakao"
2. **Native OAuth**: Expo handles OAuth flow
3. **JWT Generation**: Backend creates JWT token
4. **SecureStore**: Token saved in native secure storage
5. **WebView Injection**: Token sent via postMessage
6. **Zustand Store**: Web stores token in memory
7. **API Calls**: Fetch wrapper auto-attaches Authorization header

## 📚 Documentation

- [Architecture Guide](./docs/architecture.md)
- [API Reference](./docs/api.md)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)

## 🛠️ Tech Stack

- **Frontend**: React 19, Next.js 15, Tailwind v4
- **Mobile**: Expo 52, React Native 0.76
- **Backend**: Next.js API Routes, Prisma, Supabase
- **State**: Zustand, React Query
- **Validation**: Zod
- **Auth**: JWT, expo-auth-session, expo-secure-store
- **CI/CD**: GitHub Actions, Vercel, EAS

## 📄 License

MIT
