# 로그아웃 후 화면 전환 문제 분석 및 해결

## 🔴 문제 설명

**증상**: 로그아웃 버튼을 클릭하면 `authState`는 초기화되지만, 로그인 스크린으로 전환되지 않고 설정 탭 화면에 그대로 머물러 있음.

## 📊 근본 원인 분석

### 1. Expo Router 아키텍처 특성

프로젝트는 **file-based routing**을 사용하는 expo-router 구조입니다:

```
app/
├── app/
│   ├── index.tsx              ← 루트 화면 ("/")
│   └── (tabs)/
│       ├── _layout.tsx        ← 탭 레이아웃
│       ├── index.tsx          ← 홈 탭 ("/(tabs)")
│       ├── chat.tsx           ← 채팅 탭
│       ├── profile.tsx        ← 프로필 탭
│       └── settings.tsx       ← 설정 탭 ("/(tabs)/settings")
```

### 2. 현재 인증 흐름

```
로그인 시:
┌─────────────────────────────────────────────┐
│ 1. app/app/index.tsx (루트)                  │
│    └─ isAuthenticated: false                │
│    └─ LoginScreen 렌더링                    │
│                                             │
│ 2. 로그인 성공                               │
│    └─ useSupabaseAuth.login()               │
│    └─ isAuthenticated: true                 │
│                                             │
│ 3. index.tsx의 useEffect 실행                │
│    └─ router.replace("/(tabs)")             │
│    └─ 탭 화면으로 이동 ✅                     │
└─────────────────────────────────────────────┘

로그아웃 시 (문제 발생):
┌─────────────────────────────────────────────┐
│ 1. app/app/(tabs)/settings.tsx              │
│    └─ 로그아웃 버튼 클릭                      │
│                                             │
│ 2. useSupabaseAuth.logout() 호출             │
│    └─ isAuthenticated: false ✅              │
│    └─ Alert: "로그아웃되었습니다" ✅          │
│                                             │
│ 3. 하지만 여전히 /(tabs)/settings에 있음 ❌  │
│    └─ index.tsx의 useEffect 실행 안 됨       │
│    └─ 화면 전환 없음                         │
└─────────────────────────────────────────────┘
```

### 3. 핵심 문제

**`app/app/index.tsx`는 루트 경로(`/`)에서만 렌더링됩니다.**

```typescript:57:72:app/app/index.tsx
// 이 useEffect는 "/" 경로에 있을 때만 실행됨
useEffect(() => {
  console.log("[Index] Auth state:", { isLoading, isAuthenticated, segments });

  if (!isLoading && isAuthenticated) {
    // 로그인 시: 탭으로 이동
    const inTabs = segments[0] === "(tabs)";
    
    if (!inTabs) {
      router.replace("/(tabs)" as any);
    }
  } else if (!isLoading && !isAuthenticated) {
    // 🔴 로그아웃 감지 로직이 있지만, 
    // /(tabs)/settings에 있으면 이 코드가 실행되지 않음!
    console.log("[Index] Not authenticated, showing login screen");
  }
}, [isAuthenticated, isLoading, segments, router]);
```

**로그아웃 후에도 URL이 `/(tabs)/settings`이면**:
- `index.tsx`가 렌더링되지 않음
- 위 useEffect가 실행되지 않음
- 화면 전환이 일어나지 않음

### 4. 기술적 세부사항

#### Expo Router의 화면 렌더링 원칙

```
URL: /                    → app/app/index.tsx 렌더링
URL: /(tabs)              → app/app/(tabs)/_layout.tsx + index.tsx 렌더링
URL: /(tabs)/settings     → app/app/(tabs)/_layout.tsx + settings.tsx 렌더링
```

#### 로그아웃 시 상태 변화

```typescript:222:256:app/hooks/useSupabaseAuth.ts
const logout = useCallback(async (): Promise<void> => {
  try {
    console.log("[useSupabaseAuth] 🚪 Logout initiated");
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    console.log("[useSupabaseAuth] Calling SupabaseAuthService.signOut()");
    await SupabaseAuthService.signOut();
    console.log("[useSupabaseAuth] ✅ signOut() completed");

    // 상태 업데이트 (fallback)
    console.log("[useSupabaseAuth] Setting logged out state (fallback)");
    setAuthState({
      isAuthenticated: false,  // ✅ 상태 업데이트는 정상 작동
      isLoading: false,
      userId: null,
      email: null,
      accessToken: null,
    });

    Alert.alert("성공", "로그아웃되었습니다.");

    // WebView로 로그아웃 메시지 전송
    if (webViewRef) {
      const message = createLogoutSuccessMessage();
      nativeMessageHub.sendMessageToRef(webViewRef, message);
    }
    
    // 🔴 문제: 여기서 네비게이션을 하지 않음!
    
  } catch (error) {
    console.error("[useSupabaseAuth] ❌ Logout failed:", error);
    setAuthState((prev) => ({ ...prev, isLoading: false }));
    Alert.alert("오류", "로그아웃에 실패했습니다.");
    throw error;
  }
}, [webViewRef]);
```

**상태는 업데이트되지만, 화면 전환(navigation)은 발생하지 않습니다.**

---

## ✅ 해결 방법

### Solution 1: Settings에서 명시적 네비게이션 (적용됨)

**파일**: `app/app/(tabs)/settings.tsx`

**변경 전**:
```typescript
const handleLogout = () => {
  Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
    { text: "취소", style: "cancel" },
    {
      text: "로그아웃",
      style: "destructive",
      onPress: () => logout(),  // ❌ 로그아웃만 호출
    },
  ]);
};
```

**변경 후**:
```typescript
import { useRouter } from "expo-router";

export default function SettingsTab() {
  const router = useRouter();
  const { logout, email } = useSupabaseAuth();

  const handleLogout = async () => {
    Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/");  // ✅ 루트로 명시적 네비게이션
          } catch (error) {
            console.error("[Settings] Logout navigation failed:", error);
          }
        },
      },
    ]);
  };
  
  // ...
}
```

**동작 원리**:
```
1. 로그아웃 버튼 클릭
   └─ handleLogout() 실행

2. await logout()
   └─ isAuthenticated: false 설정
   └─ Supabase 세션 삭제

3. router.replace("/")
   └─ URL 변경: /(tabs)/settings → /
   └─ index.tsx 렌더링

4. index.tsx의 useEffect 실행
   └─ !isLoading && !isAuthenticated
   └─ LoginScreen 렌더링 ✅
```

### Solution 2: Tab Layout에서 인증 가드 추가 (적용됨)

**파일**: `app/app/(tabs)/_layout.tsx`

**추가된 코드**:
```typescript
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSupabaseAuth } from "@app/hooks/useSupabaseAuth";

export default function TabLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSupabaseAuth();

  // 인증 가드: 로그아웃되면 루트로 리다이렉트
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("[TabLayout] Not authenticated, redirecting to root");
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <Tabs
      // ...
    >
      {/* tabs */}
    </Tabs>
  );
}
```

**장점**:
- **이중 보호**: Settings에서 네비게이션을 빠뜨려도 Layout에서 캐치
- **모든 탭에 적용**: 어느 탭에서 로그아웃해도 자동으로 루트로 이동
- **URL 직접 접근 차단**: 인증 없이 `/(tabs)` URL로 접근해도 리다이렉트

### Solution 3: useSupabaseAuth에서 자동 네비게이션 (미적용)

**장점**:
- 중앙 집중식 로직
- 모든 로그아웃이 자동으로 네비게이션 처리

**단점**:
- Hook에서 router를 사용하려면 복잡한 의존성 관리 필요
- 테스트 및 재사용성 저하

**예시 코드** (참고용):
```typescript
export function useSupabaseAuth(
  webViewRef?: RefObject<WebView | null>,
  router?: ReturnType<typeof useRouter>  // 추가 파라미터
) {
  const logout = useCallback(async (): Promise<void> => {
    try {
      await SupabaseAuthService.signOut();
      setAuthState({ /* ... */ });
      
      // 네비게이션 (router가 제공된 경우만)
      if (router) {
        router.replace("/");
      }
    } catch (error) {
      // ...
    }
  }, [webViewRef, router]);
  
  // ...
}
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 정상 로그아웃
```
1. 앱 실행 → 로그인 → 탭 화면
2. Settings 탭 이동
3. 로그아웃 버튼 클릭
4. Alert 확인 → "로그아웃" 선택

✅ 예상 결과:
- Alert: "로그아웃되었습니다"
- 화면 전환: settings → 로그인 스크린
- 로그인 버튼 표시됨
```

### 시나리오 2: URL 직접 접근 시도
```
1. 로그아웃 상태
2. Deep link로 /(tabs) 접근 시도

✅ 예상 결과:
- TabLayout의 인증 가드 작동
- 자동으로 "/" (루트)로 리다이렉트
- 로그인 스크린 표시
```

### 시나리오 3: 로그아웃 실패
```
1. 로그아웃 시도
2. SupabaseAuthService.signOut() 에러

✅ 예상 결과:
- Alert: "로그아웃에 실패했습니다"
- 여전히 Settings 화면
- 재시도 가능
```

---

## 🔍 디버깅 로그

수정 후 로그아웃 시 예상되는 로그 출력:

```bash
# Settings에서 로그아웃 버튼 클릭
[Settings] Logout button pressed

# useSupabaseAuth.logout() 실행
[useSupabaseAuth] 🚪 Logout initiated
[useSupabaseAuth] Calling SupabaseAuthService.signOut()
[useSupabaseAuth] ✅ signOut() completed
[useSupabaseAuth] Setting logged out state (fallback)

# onAuthStateChange 리스너 작동
[useSupabaseAuth] Auth state changed: SIGNED_OUT

# Settings에서 네비게이션
[Settings] Navigating to root after logout

# TabLayout 인증 가드 작동
[TabLayout] Not authenticated, redirecting to root

# index.tsx 렌더링
[Index] Auth state: { isLoading: false, isAuthenticated: false, segments: [] }
[Index] Not authenticated, showing login screen

# LoginScreen 렌더링
[LoginScreen] Rendered
```

---

## 📝 추가 권장사항

### 1. 로그아웃 후 WebView 상태 초기화

WebView가 캐시된 상태로 남아있을 수 있으므로, 로그아웃 시 WebView를 리셋하는 것이 좋습니다:

```typescript
// web/hooks/useAuthMessage.ts
useMessageHandler<LogoutSuccessMessage>(
  NativeToWebMessageType.LOGOUT_SUCCESS,
  () => {
    clearAuth();
    // 추가: 페이지 리로드 또는 캐시 클리어
    window.location.reload(); // 옵션
  },
  [clearAuth]
);
```

### 2. 토큰 만료 시 자동 로그아웃

```typescript
// app/hooks/useSupabaseAuth.ts
useEffect(() => {
  const checkTokenExpiry = setInterval(async () => {
    const session = await SupabaseAuthService.getSession();
    if (!session && isAuthenticated) {
      console.log("[useSupabaseAuth] Session expired, logging out");
      logout();
    }
  }, 60000); // 1분마다 체크

  return () => clearInterval(checkTokenExpiry);
}, [isAuthenticated, logout]);
```

### 3. 에러 바운더리 추가

네비게이션 실패 시를 대비한 에러 처리:

```typescript
const handleLogout = async () => {
  Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
    { text: "취소", style: "cancel" },
    {
      text: "로그아웃",
      style: "destructive",
      onPress: async () => {
        try {
          await logout();
          router.replace("/");
        } catch (error) {
          console.error("[Settings] Logout navigation failed:", error);
          // Fallback: 강제 앱 재시작
          Alert.alert("알림", "로그아웃을 완료하려면 앱을 다시 시작해주세요.");
        }
      },
    },
  ]);
};
```

---

## 📊 요약

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| **로그아웃 시 네비게이션** | ❌ 없음 | ✅ `router.replace("/")` |
| **인증 가드 위치** | ❌ 루트만 | ✅ 루트 + 탭 레이아웃 |
| **로그아웃 후 화면** | ❌ Settings 탭 그대로 | ✅ 로그인 스크린 |
| **URL 직접 접근 보호** | ❌ 없음 | ✅ TabLayout에서 리다이렉트 |

### 변경된 파일

1. ✅ `app/app/(tabs)/settings.tsx`
   - `useRouter` import 추가
   - `handleLogout`에서 `router.replace("/")` 호출

2. ✅ `app/app/(tabs)/_layout.tsx`
   - 인증 가드 useEffect 추가
   - 인증 해제 시 자동 루트 리다이렉트

### 해결된 문제

- ✅ 로그아웃 후 로그인 스크린으로 전환
- ✅ 인증 없이 탭 접근 차단
- ✅ 이중 보호 (Settings + Layout)
- ✅ Expo Router 네비게이션 흐름 준수

---

## 🎯 결론

**근본 원인**: Expo Router의 file-based routing에서 로그아웃 후 명시적인 네비게이션이 없었음.

**해결 방법**: 
1. Settings에서 로그아웃 후 `router.replace("/")`로 루트 이동
2. TabLayout에서 인증 가드로 이중 보호

**결과**: 로그아웃 시 정상적으로 로그인 스크린으로 전환됩니다.

