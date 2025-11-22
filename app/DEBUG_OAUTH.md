# OAuth 디버깅 가이드

## 현재 문제: 브라우저에서 멈춤

브라우저가 열린 후 `artpglrhshq.supabase.co`에서 멈춰있는 경우, 다음을 확인하세요.

---

## 1. Supabase 대시보드 설정 확인

### 1.1 Google OAuth 활성화

1. [Supabase Dashboard](https://app.supabase.com) → 프로젝트 선택
2. **Authentication** → **Providers** 이동
3. **Google** 프로바이더 찾기
4. **Enable Google provider** 토글 ON
5. **Client ID (for OAuth)** 입력
   - Google Cloud Console에서 생성한 OAuth 2.0 클라이언트 ID
6. **Client Secret (for OAuth)** 입력
7. **Save** 클릭

### 1.2 Redirect URL 등록

1. **Authentication** → **URL Configuration** 이동
2. **Redirect URLs** 섹션에 다음 추가:
   ```
   sampyeongoh://auth/callback
   ```
3. **Site URL** 확인:
   ```
   sampyeongoh://
   ```
   또는
   ```
   https://your-domain.com
   ```

---

## 2. Google Cloud Console 설정 확인

### 2.1 OAuth 동의 화면 설정

1. [Google Cloud Console](https://console.cloud.google.com/)
2. 프로젝트 선택
3. **APIs & Services** → **OAuth consent screen**
4. **User Type**: External 선택 (테스트용)
5. **App name**, **User support email** 입력
6. **Developer contact information** 입력
7. **Save and Continue**

### 2.2 OAuth 클라이언트 ID 생성

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. **Application type**: Web application
4. **Name**: Supabase OAuth (또는 원하는 이름)
5. **Authorized redirect URIs**에 추가:
   ```
   https://atsnifcqrmartpglrshq.supabase.co/auth/v1/callback
   ```
   (Supabase 프로젝트 URL은 실제 프로젝트 URL로 변경)
6. **Create**
7. **Client ID**와 **Client Secret** 복사
8. Supabase 대시보드에 입력

### 2.3 Android용 OAuth 클라이언트 (선택사항)

앱에서 직접 Google OAuth를 사용하는 경우:

1. **Create Credentials** → **OAuth client ID**
2. **Application type**: Android
3. **Package name**: `com.sampyeongoh.app`
4. **SHA-1 certificate fingerprint**: 디버그 키 해시 입력
5. **Create**

---

## 3. 앱 설정 확인

### 3.1 app.json 확인

```json
{
  "expo": {
    "scheme": "sampyeongoh",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
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

### 3.2 환경 변수 확인

`.env` 파일:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://atsnifcqrmartpglrshq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 4. 테스트 및 디버깅

### 4.1 로그 확인

앱 실행 시 다음 로그가 나타나야 합니다:

```
[SupabaseAuth] Redirect URL: sampyeongoh://auth/callback
[SupabaseAuth] Auth URL: https://atsnifcqrmartpglrshq.supabase.co/auth/v1/authorize?provider=google&redirect_to=sampyeongoh%3A%2F%2Fauth%2Fcallback
[SupabaseAuth] Expected redirect URL: sampyeongoh://auth/callback
[SupabaseAuth] Opening browser for OAuth...
[SupabaseAuth] Waiting for OAuth callback...
```

### 4.2 브라우저에서 확인

브라우저가 열리면:

1. **정상**: Google 로그인 페이지가 표시됨
2. **문제**: 빈 화면 또는 에러 페이지
   - Supabase URL이 올바른지 확인
   - Google OAuth 설정 확인
   - 네트워크 연결 확인

### 4.3 Deep Linking 테스트

터미널에서:

```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "sampyeongoh://auth/callback?code=test123" com.sampyeongoh.app
```

앱이 열리고 다음 로그가 나타나야 합니다:

```
[Index] Deep link received: sampyeongoh://auth/callback?code=test123
[Index] OAuth callback detected, completing session...
```

---

## 5. 일반적인 문제 해결

### 문제 1: 브라우저가 빈 화면에서 멈춤

**원인**: Supabase Google OAuth가 활성화되지 않았거나 설정이 잘못됨

**해결**:
1. Supabase 대시보드에서 Google OAuth 활성화 확인
2. Client ID와 Client Secret이 올바른지 확인
3. Google Cloud Console에서 OAuth 클라이언트가 올바르게 설정되었는지 확인

### 문제 2: "redirect_uri_mismatch" 에러

**원인**: Google Cloud Console의 Redirect URI와 Supabase 설정이 일치하지 않음

**해결**:
1. Google Cloud Console → OAuth 클라이언트 → Authorized redirect URIs 확인
2. Supabase 프로젝트 URL 확인: `https://[project-ref].supabase.co/auth/v1/callback`
3. 정확히 일치하는지 확인

### 문제 3: 타임아웃 에러 (2분 후)

**원인**: 리다이렉트가 발생하지 않음

**해결**:
1. Supabase 대시보드에서 Redirect URL이 등록되었는지 확인
2. `app.json`의 intentFilters가 올바른지 확인
3. 앱 재빌드: `npm run android:dev`

### 문제 4: "OAuth cancelled or failed: dismiss"

**원인**: 리다이렉트는 되지만 앱으로 돌아오지 않음

**해결**:
1. Android intentFilters 확인
2. Deep linking 리스너가 제대로 작동하는지 확인
3. `WebBrowser.maybeCompleteAuthSession()` 호출 확인

---

## 6. 체크리스트

OAuth 설정이 올바른지 확인:

- [ ] Supabase 대시보드에서 Google OAuth 활성화됨
- [ ] Supabase 대시보드에 `sampyeongoh://auth/callback` Redirect URL 등록됨
- [ ] Google Cloud Console에 OAuth 클라이언트 생성됨
- [ ] Google Cloud Console에 Supabase Redirect URI 등록됨
- [ ] `app.json`에 `scheme: "sampyeongoh"` 설정됨
- [ ] `app.json`에 Android `intentFilters` 설정됨
- [ ] `.env` 파일에 Supabase URL과 Key 설정됨
- [ ] 앱 재빌드 완료 (`npm run android:dev`)

---

## 7. 추가 리소스

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Google OAuth 설정](https://developers.google.com/identity/protocols/oauth2)
- [Expo AuthSession 문서](https://docs.expo.dev/versions/latest/sdk/auth-session/)

