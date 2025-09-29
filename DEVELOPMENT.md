# Befun v3 개발 가이드

## 🚀 시작하기

### 필수 요구사항

- Node.js 20+
- npm 또는 yarn
- Git
- Supabase 계정 (데이터베이스)

### 초기 설정

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd befun-v3
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   ```bash
   cp .env.example .env.local
   # .env.local 파일을 편집하여 실제 값들을 설정하세요
   ```

4. **개발 환경 자동 설정**
   ```bash
   node scripts/dev-setup.js
   ```

5. **개발 서버 시작**
   ```bash
   npm run dev
   ```

## 📁 프로젝트 구조

```
befun-v3/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── api/               # API 라우트
│   │   │   └── v1/           # API v1 엔드포인트
│   │   ├── api-docs/         # API 문서 페이지
│   │   └── ...               # 기타 앱 페이지
│   ├── lib/                   # 라이브러리 및 유틸리티
│   │   ├── api/              # API 관련 유틸리티
│   │   └── ...
│   ├── types/                 # TypeScript 타입 정의
│   ├── config/               # 설정 파일들
│   └── components/           # React 컴포넌트
├── __tests__/                # 테스트 파일
├── scripts/                  # 개발 스크립트
├── docs/                     # 프로젝트 문서
└── public/                   # 정적 파일
```

## 🛠️ 개발 명령어

### 기본 명령어

```bash
npm run dev           # 개발 서버 시작 (http://localhost:3000)
npm run build         # 프로덕션 빌드
npm run start         # 프로덕션 서버 시작
npm run lint          # ESLint 코드 검사
npm run lint:fix      # ESLint 자동 수정
npm run type-check    # TypeScript 타입 검사
```

### 테스트 명령어

```bash
npm run test          # 테스트 실행
npm run test:watch    # 테스트 감시 모드
npm run test:coverage # 커버리지 포함 테스트
```

### Storybook

```bash
npm run storybook       # Storybook 개발 서버
npm run build-storybook # Storybook 빌드
```

## 📊 API 개발

### API 구조

- **Base URL**: `/api/v1`
- **인증**: JWT Bearer Token
- **응답 형식**: JSON (일관된 응답 구조)
- **문서**: http://localhost:3000/api-docs

### API 엔드포인트

```
GET    /api/v1/status                    # 헬스 체크
GET    /api/v1/designs                   # 디자인 목록 조회
POST   /api/v1/designs                   # 새 디자인 생성
PUT    /api/v1/designs/{id}             # 디자인 수정
DELETE /api/v1/designs/{id}             # 디자인 삭제
POST   /api/v1/pricing                   # 가격 계산
GET    /api/v1/bff/configurator         # 설정기 초기화 데이터
POST   /api/v1/checkout                  # 결제 세션 생성
GET    /api/v1/profile                   # 사용자 프로필
```

### 새 API 엔드포인트 추가

1. **API 라우트 파일 생성**
   ```typescript
   // src/app/api/v1/your-endpoint/route.ts
   import { validateAuth } from '@/lib/api/auth'
   import { handleError } from '@/lib/api/errors'

   export async function GET(request: NextRequest) {
     try {
       const { user } = await validateAuth(request)
       // API 로직 구현
       return Response.json({ success: true, data: {} })
     } catch (error) {
       return handleError(error)
     }
   }
   ```

2. **OpenAPI 스키마 추가**
   ```typescript
   /**
    * @swagger
    * /api/v1/your-endpoint:
    *   get:
    *     summary: Your endpoint description
    *     tags: [YourTag]
    *     responses:
    *       200:
    *         description: Success response
    */
   ```

3. **테스트 작성**
   ```typescript
   // __tests__/api/v1/your-endpoint.test.ts
   describe('/api/v1/your-endpoint', () => {
     it('should return success response', async () => {
       // 테스트 코드
     })
   })
   ```

## 🔐 인증 및 보안

### 인증 흐름

1. 사용자가 로그인 (Supabase Auth)
2. JWT 토큰 발급
3. 클라이언트에서 `Authorization: Bearer <token>` 헤더로 전송
4. 서버에서 토큰 검증 (`validateAuth` 함수 사용)

### 권한 관리

```typescript
import { checkPermissions } from '@/lib/api/auth'

// 특정 권한 확인
const hasPermission = checkPermissions(user, ['read:designs'])
```

### CSRF 보호

- POST, PUT, PATCH, DELETE 요청에 `X-CSRF-Token` 헤더 필요
- 클라이언트에서 세션 스토리지의 토큰 사용

## 🧪 테스트 가이드

### 테스트 구조

```
__tests__/
├── setup.ts              # 테스트 설정
├── helpers/
│   └── test-utils.ts     # 테스트 유틸리티
├── api/
│   └── v1/              # API 테스트
├── lib/
│   └── api/             # 라이브러리 테스트
└── components/          # 컴포넌트 테스트
```

### 테스트 작성 예시

```typescript
import { createAuthenticatedRequest, expectApiResponse } from '../../helpers/test-utils'

describe('/api/v1/designs', () => {
  it('should return designs list', async () => {
    const request = createAuthenticatedRequest({
      url: 'http://localhost:3000/api/v1/designs'
    })

    const response = await GET(request)
    expectApiResponse(response, 200)
  })
})
```

## 📈 성능 모니터링

### 캐싱 전략

- 메모리 캐시: 짧은 TTL (5분)
- API 응답 캐싱
- 데이터베이스 쿼리 최적화

### 모니터링 메트릭

- 응답 시간
- 에러율
- 캐시 히트율
- 데이터베이스 연결 상태

## 🚀 배포 가이드

### Vercel 배포

1. **환경 변수 설정**
   - Vercel 대시보드에서 환경 변수 등록
   - Production, Preview, Development 환경별 설정

2. **자동 배포**
   - `main` 브랜치: Production 배포
   - PR: Preview 배포

### 환경별 설정

```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🔧 트러블슈팅

### 일반적인 문제들

1. **환경 변수 오류**
   ```bash
   # .env.local 파일이 올바르게 설정되었는지 확인
   node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
   ```

2. **타입 오류**
   ```bash
   npm run type-check
   ```

3. **테스트 실패**
   ```bash
   npm run test -- --verbose
   ```

4. **빌드 오류**
   ```bash
   rm -rf .next
   npm run build
   ```

### 로그 확인

```bash
# 개발 서버 로그
tail -f .next/trace

# Vercel 로그
vercel logs
```

## 📝 코드 스타일

### ESLint 설정

- Next.js 권장 설정 사용
- TypeScript 엄격 모드
- React Hooks 규칙 적용

### Prettier 설정

- 세미콜론 사용
- 작은따옴표 선호
- 2칸 들여쓰기

### 커밋 메시지 규칙

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 업데이트
style: 코드 스타일 변경
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 기타 변경사항
```

## 🤝 기여하기

1. Fork 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📞 도움말

- **API 문서**: http://localhost:3000/api-docs
- **Storybook**: http://localhost:6006
- **개발 설정 스크립트**: `node scripts/dev-setup.js`

---

더 자세한 정보나 질문이 있으시면 개발팀에 문의해주세요.