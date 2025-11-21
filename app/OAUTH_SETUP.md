# OAuth 설정 가이드

실제 Google과 Kakao OAuth 로그인을 사용하기 위한 단계별 설정 가이드입니다.

---

## 📋 목차

1. [환경 변수 설정](#1-환경-변수-설정)
2. [Google OAuth 설정](#2-google-oauth-설정)
3. [Kakao OAuth 설정](#3-kakao-oauth-설정)
4. [Android 네이티브 설정](#4-android-네이티브-설정)
5. [iOS 네이티브 설정](#5-ios-네이티브-설정)
6. [테스트 방법](#6-테스트-방법)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. 환경 변수 설정

### 1.1 `.env` 파일 생성

`app/.env` 파일을 생성하고 다음 내용을 추가합니다:

```bash
# Mock authentication (개발 중 실제 OAuth 없이 테스트)
EXPO_PUBLIC_USE_MOCK_OAUTH=true

# Google OAuth Credentials
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=

# Kakao OAuth Credentials
EXPO_PUBLIC_KAKAO_APP_KEY=
EXPO_PUBLIC_KAKAO_JS_KEY=
```

### 1.2 개발 중 Mock 사용

실제 OAuth 설정 전까지는 `EXPO_PUBLIC_USE_MOCK_OAUTH=true`로 설정하여 Mock 인증을 사용할 수 있습니다.

---

## 2. Google OAuth 설정

### 2.1 Google Cloud Console 프로젝트 생성

1. **Google Cloud Console 접속**: https://console.cloud.google.com/
2. **새 프로젝트 생성**:
   - 프로젝트 이름: `Sam-Pyeong-Oh` (또는 원하는 이름)
3. **프로젝트 선택** 후 다음 단계로 진행

### 2.2 OAuth 동의 화면 구성

1. **API 및 서비스 > OAuth 동의 화면** 이동
2. **사용자 유형**: 외부 선택
3. **앱 정보 입력**:
   - 앱 이름: `Sam-Pyeong-Oh`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
4. **범위 추가**:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. **저장 후 계속**

### 2.3 OAuth 2.0 클라이언트 ID 생성

#### Android용 클라이언트 ID

1. **사용자 인증 정보 > 사용자 인증 정보 만들기 > OAuth 클라이언트 ID**
2. **애플리케이션 유형**: Android
3. **패키지 이름**: `com.sampyeongoh.app` (app.json의 `android.package`와 동일)
4. **SHA-1 인증서 지문 생성**:

```bash
# 개발용 디버그 키스토어 (기본 위치)
keytool -keystore ~/.android/debug.keystore -list -v

# 또는 Windows
keytool -keystore "%USERPROFILE%\.android\debug.keystore" -list -v

# 비밀번호: android
```

5. SHA-1 지문을 복사하여 입력
6. **생성** 클릭하고 **클라이언트 ID 복사**
7. `.env` 파일에 추가:
```bash
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

#### iOS용 클라이언트 ID

1. **사용자 인증 정보 만들기 > OAuth 클라이언트 ID**
2. **애플리케이션 유형**: iOS
3. **번들 ID**: `com.sampyeongoh.app` (app.json의 `ios.bundleIdentifier`와 동일)
4. **생성** 클릭하고 **클라이언트 ID 복사**
5. `.env` 파일에 추가:
```bash
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

#### Expo Go용 클라이언트 ID (개발 환경)

1. **사용자 인증 정보 만들기 > OAuth 클라이언트 ID**
2. **애플리케이션 유형**: 웹 애플리케이션
3. **승인된 리디렉션 URI 추가**:
   - `https://auth.expo.io/@your-expo-username/sam-pyeong-oh`
4. **생성** 클릭하고 **클라이언트 ID 복사**
5. `.env` 파일에 추가:
```bash
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## 3. Kakao OAuth 설정

### 3.1 Kakao Developers 앱 생성

1. **Kakao Developers 접속**: https://developers.kakao.com/
2. **내 애플리케이션 > 애플리케이션 추가하기**
3. **앱 정보 입력**:
   - 앱 이름: `Sam-Pyeong-Oh`
   - 사업자명: 개인 또는 회사명
4. **저장**

### 3.2 플랫폼 설정

#### Android 플랫폼 추가

1. **앱 설정 > 플랫폼 > Android 플랫폼 등록**
2. **패키지명**: `com.sampyeongoh.app`
3. **마켓 URL**: (선택사항)
4. **키 해시 등록**:

```bash
# 개발용 디버그 키 해시 생성 (macOS/Linux)
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64

# Windows
keytool -exportcert -alias androiddebugkey -keystore "%USERPROFILE%\.android\debug.keystore" | openssl sha1 -binary | openssl base64

# 비밀번호: android
```

5. 생성된 키 해시를 입력 (예: `Xo8WBi6jzSxKDVR4drqm84yr9iU=`)

#### iOS 플랫폼 추가

1. **앱 설정 > 플랫폼 > iOS 플랫폼 등록**
2. **번들 ID**: `com.sampyeongoh.app`
3. **저장**

### 3.3 앱 키 확인

1. **앱 설정 > 요약 정보**
2. **앱 키 복사**:
   - **네이티브 앱 키** 복사
   - **JavaScript 키** 복사 (웹뷰 fallback용)
3. `.env` 파일에 추가:
```bash
EXPO_PUBLIC_KAKAO_APP_KEY=네이티브앱키
EXPO_PUBLIC_KAKAO_JS_KEY=JavaScript키
```

### 3.4 Kakao 로그인 활성화

1. **제품 설정 > 카카오 로그인**
2. **활성화 설정**: ON
3. **Redirect URI 등록**:
   - `kakao네이티브앱키://oauth` 형식으로 등록
4. **동의 항목 설정**:
   - 프로필 정보 (닉네임/프로필 사진): 필수 동의
   - 카카오계정 (이메일): 선택 동의
5. **저장**

---

## 4. Android 네이티브 설정

### 4.1 Kakao SDK 설정 (AndroidManifest.xml)

`app/android/app/src/main/AndroidManifest.xml` 파일을 수정합니다:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
    <!-- 기존 내용 ... -->

    <!-- Kakao SDK 설정 -->
    <meta-data
      android:name="com.kakao.sdk.AppKey"
      android:value="@string/kakao_app_key" />

    <!-- Kakao Login Activity -->
    <activity
      android:name="com.kakao.sdk.auth.AuthCodeHandlerActivity"
      android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />

        <!-- Redirect URI: kakao{NATIVE_APP_KEY}://oauth -->
        <data
          android:host="oauth"
          android:scheme="kakao네이티브앱키" />
      </intent-filter>
    </activity>
  </application>
</manifest>
```

### 4.2 Kakao App Key 리소스 추가

`app/android/app/src/main/res/values/strings.xml` 파일을 생성/수정:

```xml
<resources>
  <string name="app_name">Sam-Pyeong-Oh</string>
  <string name="kakao_app_key">네이티브앱키</string>
</resources>
```

### 4.3 app.json 설정

`app/app.json` 파일에 Android scheme 추가:

```json
{
  "expo": {
    "android": {
      "package": "com.sampyeongoh.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "category": ["DEFAULT", "BROWSABLE"],
          "data": {
            "scheme": "com.sampyeongoh.app"
          }
        }
      ]
    }
  }
}
```

---

## 5. iOS 네이티브 설정

### 5.1 Kakao SDK 설정 (Info.plist)

`app/ios/SamPyeongOh/Info.plist` 파일을 수정합니다:

```xml
<plist version="1.0">
<dict>
  <!-- 기존 내용 ... -->

  <!-- Kakao App Key -->
  <key>KAKAO_APP_KEY</key>
  <string>네이티브앱키</string>

  <!-- Kakao URL Schemes -->
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeRole</key>
      <string>Editor</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>kakao네이티브앱키</string>
      </array>
    </dict>
  </array>

  <!-- Kakao Query Schemes -->
  <key>LSApplicationQueriesSchemes</key>
  <array>
    <string>kakaokompassauth</string>
    <string>kakaolink</string>
    <string>kakaotalk</string>
  </array>
</dict>
</plist>
```

### 5.2 app.json 설정

`app/app.json` 파일에 iOS scheme 추가:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.sampyeongoh.app",
      "infoPlist": {
        "LSApplicationQueriesSchemes": [
          "kakaokompassauth",
          "kakaolink",
          "kakaotalk"
        ]
      }
    },
    "scheme": "com.sampyeongoh.app"
  }
}
```

---

## 6. 테스트 방법

### 6.1 Mock 인증 테스트

1. `.env` 파일에서 `EXPO_PUBLIC_USE_MOCK_OAUTH=true` 설정
2. 앱 재시작:
```bash
cd app
npm run start:dev
```
3. 로그인 버튼 클릭 → Mock 토큰 생성 확인

### 6.2 실제 OAuth 테스트

1. `.env` 파일에서 `EXPO_PUBLIC_USE_MOCK_OAUTH=false` 설정
2. 모든 클라이언트 ID / 앱 키가 올바르게 설정되었는지 확인
3. 앱 재빌드 (환경 변수 변경 시 필수):
```bash
# Android
npm run android:dev

# iOS
npm run ios
```
4. 로그인 버튼 클릭 → OAuth 인증 화면 확인

### 6.3 검증 체크리스트

- [ ] Google 로그인 버튼 클릭 시 Google 계정 선택 화면이 나타남
- [ ] Google 계정 선택 후 앱으로 돌아와 로그인 성공 메시지 표시
- [ ] Kakao 로그인 버튼 클릭 시 Kakao 로그인 화면 또는 Kakao Talk 연동
- [ ] Kakao 로그인 완료 후 앱으로 돌아와 로그인 성공 메시지 표시
- [ ] SecureStore에 토큰이 저장됨 (앱 재시작 시 자동 로그인)
- [ ] WebView에 토큰이 전달되어 인증 상태 유지

---

## 7. 트러블슈팅

### 7.1 Google OAuth 오류

#### "Error 400: redirect_uri_mismatch"
- **원인**: Redirect URI가 일치하지 않음
- **해결**:
  1. 콘솔에 출력된 `[GoogleOAuth] Redirect URI` 확인
  2. Google Cloud Console의 OAuth 클라이언트 ID 설정에 해당 URI 추가

#### "CLIENT_ID not found"
- **원인**: 클라이언트 ID가 설정되지 않음
- **해결**:
  1. `.env` 파일 확인
  2. `EXPO_PUBLIC_GOOGLE_[PLATFORM]_CLIENT_ID` 값이 올바른지 확인
  3. 앱 재빌드 (`npm run android:dev` 또는 `npm run ios`)

### 7.2 Kakao OAuth 오류

#### "Kakao SDK not initialized"
- **원인**: 네이티브 설정이 누락됨
- **해결**:
  1. `AndroidManifest.xml` / `Info.plist` 설정 확인
  2. 앱 키가 올바르게 설정되었는지 확인
  3. 앱 재빌드

#### "Invalid key hash"
- **원인**: 등록된 키 해시가 실제 디버그 키와 다름
- **해결**:
  1. 키 해시를 다시 생성 (섹션 3.2 참고)
  2. Kakao Developers Console에 새 키 해시 추가
  3. 여러 키 해시를 등록할 수 있으므로 기존 것은 삭제하지 않아도 됨

#### "App not found"
- **원인**: 앱 키가 잘못됨
- **해결**:
  1. Kakao Developers Console에서 네이티브 앱 키 재확인
  2. `.env` 파일 업데이트
  3. 앱 재빌드

### 7.3 일반적인 오류

#### 환경 변수가 적용되지 않음
- **해결**: 환경 변수 변경 후 반드시 앱 재빌드 필요
```bash
npm run start:dev  # 캐시 클리어하여 재시작
```

#### SecureStore 에러
- **해결**: iOS 시뮬레이터에서 간혹 발생, 실제 기기에서 테스트

---

## 📚 추가 자료

### Google OAuth
- [Google Cloud Console](https://console.cloud.google.com/)
- [Expo Google 인증 문서](https://docs.expo.dev/guides/authentication/#google)

### Kakao OAuth
- [Kakao Developers](https://developers.kakao.com/)
- [Kakao Login 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [@react-native-seoul/kakao-login](https://github.com/react-native-seoul/kakao-login)

### Expo 인증
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

---

## ✅ 완료 후

설정이 완료되면:
1. `EXPO_PUBLIC_USE_MOCK_OAUTH=false`로 변경
2. 앱 재빌드
3. 실제 OAuth로 로그인 테스트
4. 프로덕션 빌드 전 모든 플랫폼에서 테스트 완료

**Mock 모드는 개발 편의를 위한 것이므로, 프로덕션 배포 전에 반드시 실제 OAuth를 설정하세요!**
