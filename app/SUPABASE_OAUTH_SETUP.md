# Supabase OAuth 설정 가이드

## 문제 해결: OAuth 리다이렉트 후 dismiss 에러

### 원인 분석

OAuth 인증 플로우에서 리다이렉트는 성공하지만 `dismiss` 에러가 발생하는 주요 원인:

1. **Android Intent Filters 누락**: 앱이 리다이렉트 URL을 처리할 수 없음
2. **Supabase Redirect URL 미등록**: Supabase 대시보드에 리다이렉트 URL이 등록되지 않음
3. **Deep Linking 처리 부족**: 리다이렉트 후 앱이 세션을 완료하지 못함

---

## 해결 방법

### 1. Supabase 대시보드 설정

#### 1.1 Redirect URL 등록

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. **Authentication** → **URL Configuration** 이동
4. **Redirect URLs** 섹션에 다음 URL 추가:

```
sampyeongoh://auth/callback
```

**중요**: 
- 개발 환경과 프로덕션 환경 모두 등록
- 여러 URL을 등록할 수 있으므로 각 환경별로 추가

#### 1.2 Site URL 확인

**Authentication** → **URL Configuration**에서:

- **Site URL**: `sampyeongoh://` (또는 앱의 메인 스킴)
- **Redirect URLs**: `sampyeongoh://auth/callback` 포함

---

### 2. 앱 설정 확인

#### 2.1 app.json 설정

다음 설정이 올바르게 되어 있는지 확인:

```json
{
  "expo": {
    "scheme": "sampyeongoh",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "sampyeongoh",
              "host": "auth",
              "pathPrefix": "/callback"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

#### 2.2 환경 변수 확인

`.env` 파일에 다음 변수가 설정되어 있는지 확인:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

### 3. 테스트 방법

#### 3.1 앱 재빌드

설정 변경 후 반드시 앱을 재빌드해야 합니다:

```bash
cd app
npm run android:dev
```

#### 3.2 로그 확인

OAuth 플로우 중 다음 로그를 확인하세요:

```
[SupabaseAuth] Redirect URL: sampyeongoh://auth/callback
[SupabaseAuth] Auth URL: https://...
[SupabaseAuth] Expected redirect URL: sampyeongoh://auth/callback
[SupabaseAuth] OAuth result type: success
[SupabaseAuth] OAuth result URL: sampyeongoh://auth/callback?code=...
```

#### 3.3 에러 발생 시

**"OAuth cancelled or failed: dismiss"** 에러가 발생하면:

1. **Supabase 대시보드 확인**:
   - Redirect URLs에 `sampyeongoh://auth/callback`이 등록되어 있는지 확인
   - Site URL이 올바른지 확인

2. **앱 설정 확인**:
   - `app.json`의 `scheme`이 `sampyeongoh`인지 확인
   - Android `intentFilters`가 올바르게 설정되었는지 확인

3. **앱 재빌드**:
   - 설정 변경 후 반드시 앱을 재빌드

4. **디바이스 확인**:
   - 실제 Android 디바이스에서 테스트 (에뮬레이터에서도 작동하지만 실제 기기 권장)

---

## 추가 디버깅

### Deep Linking 테스트

앱이 리다이렉트 URL을 올바르게 처리하는지 테스트:

```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "sampyeongoh://auth/callback?code=test123" com.sampyeongoh.app
```

앱이 열리고 콘솔에 다음 로그가 나타나야 합니다:

```
[Index] Deep link received: sampyeongoh://auth/callback?code=test123
[Index] OAuth callback detected, completing session...
```

---

## 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Expo AuthSession 문서](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Linking 문서](https://docs.expo.dev/versions/latest/sdk/linking/)

