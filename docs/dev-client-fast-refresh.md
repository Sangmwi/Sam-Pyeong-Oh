# Expo Dev Client Fast Refresh 가이드

## 📌 개요

Expo Dev Client에서 Fast Refresh를 사용하여 코드 변경 시 즉시 앱을 업데이트하는 방법입니다.

---

## 🚀 Fast Refresh 활성화 방법

### 1. 초기 설정 (한 번만)

#### Android 빌드
```bash
cd app
npm run android:dev
```

#### iOS 빌드
```bash
cd app
npm run ios:dev
```

**중요**: 이 명령은 **처음 한 번만** 실행하면 됩니다. Dev Client 앱이 기기에 설치됩니다.

---

### 2. 개발 서버 시작

#### 기본 시작
```bash
cd app
npm start
```

#### 캐시 클리어 후 시작 (문제 발생 시)
```bash
cd app
npm run start:dev
```

---

### 3. Dev Client 앱에서 연결

1. **기기/에뮬레이터에서 Dev Client 앱 실행**
2. **개발 서버 URL 입력** (예: `exp://192.168.0.100:8081`)
3. **연결 완료!**

---

## ⚡ Fast Refresh 작동 방식

### 자동 리프레시

코드를 저장하면 **즉시** 앱에 반영됩니다:

```typescript
// app/app/index.tsx 수정
export default function Index() {
  return (
    <View>
      <Text>Hello World!</Text> {/* 이 텍스트 변경하면 즉시 반영 */}
    </View>
  );
}
```

**저장 → 1초 이내 앱 업데이트!**

---

## 🔧 Metro 설정 (이미 완료됨)

### `app/metro.config.js`

```javascript
// ✅ Fast Refresh 최적화 설정 완료
config.watchFolders = [
  path.resolve(__dirname, '..'), // 루트 디렉토리 감시
];

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return middleware(req, res, next);
    };
  },
};
```

---

## 📱 Monorepo에서 Fast Refresh

### Shared 패키지 변경도 즉시 반영

```typescript
// shared/src/bridge/messages.ts 수정
export interface NewMessage {
  type: 'NEW_TYPE';
  payload: { data: string };
}
```

**저장 → Metro가 자동 감지 → 앱 즉시 업데이트!**

---

## 🛠️ 문제 해결

### Fast Refresh가 작동하지 않을 때

#### 1. Metro 서버 재시작
```bash
# 터미널에서 Ctrl+C로 중지
npm run start:dev  # 캐시 클리어 후 재시작
```

#### 2. Dev Client 앱 재시작
- 앱 완전히 종료
- Dev Client 앱 다시 실행
- 개발 서버에 재연결

#### 3. 네이티브 코드 변경 시
```bash
# 네이티브 코드 변경했을 때만 필요
npm run android:dev  # Android
npm run ios:dev      # iOS
```

#### 4. 캐시 완전히 삭제
```bash
cd app
rm -rf node_modules/.cache
rm -rf .expo
npm run start:dev
```

---

## 🎯 Fast Refresh 팁

### 1. 상태 유지

Fast Refresh는 **컴포넌트 상태를 유지**합니다:

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>{count}</Text>  {/* count 값 유지됨! */}
      <Button onPress={() => setCount(count + 1)} />
    </View>
  );
}
```

**UI 수정 → count 값 그대로 유지!**

### 2. 수동 리프레시

앱에서 **R 키 두 번** 또는 **흔들기** → 수동 리프레시

### 3. 개발자 메뉴

**R 키 한 번** 또는 **흔들기** → 개발자 메뉴:
- Reload
- Debug Remote JS
- Toggle Performance Monitor
- Toggle Inspector

---

## 📊 Fast Refresh vs Hot Reload

| 기능 | Fast Refresh | Hot Reload (구버전) |
|------|--------------|---------------------|
| 상태 유지 | ✅ | ❌ |
| 에러 복구 | ✅ | ❌ |
| Hooks 지원 | ✅ | ⚠️ 제한적 |
| 속도 | 매우 빠름 | 느림 |

---

## ✅ 요약

1. **초기 빌드**: `npm run android:dev` 또는 `npm run ios:dev` (한 번만)
2. **개발 서버**: `npm start` (매번)
3. **코드 수정**: 저장만 하면 즉시 반영!
4. **문제 발생**: `npm run start:dev`로 캐시 클리어

Fast Refresh로 생산성 10배 향상! 🚀
