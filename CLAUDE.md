# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

BeFun v3는 **프로덕션 준비 완료된 3D 책상 커스터마이저 플랫폼**으로, 실시간 3D 시각화, 즉각적인 가격 계산, 원활한 구매 연동을 제공합니다. Next.js 14와 Three.js r169로 구축되었으며, Supabase 백엔드와 함께 Vercel의 서버리스 인프라에 배포됩니다.

## 기술 스택 및 아키텍처

### 핵심 기술
- **프론트엔드**: Next.js 14.2.33 (App Router) + React 18.3.1 + TypeScript 5.3.x
- **3D 렌더링**: Three.js r169 (안정성을 위한 고정 버전)
- **데이터베이스**: Supabase (PostgreSQL 15) with Row Level Security
- **배포**: Vercel Serverless (Node.js 20.x에 최적화)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui 컴포넌트
- **API 패턴**: BFF (Backend for Frontend) with 버전 관리 엔드포인트

### 주요 요구사항
- Node.js v20.x LTS (필수)
- TypeScript strict mode 활성화
- 모바일 기기에서 최소 30 FPS
- 가격 계산 API 응답 시간 < 500ms

## 필수 개발 명령어

### 핵심 개발
```bash
npm run dev                    # 개발 서버 (port 3000)
PORT=3001 npm run dev         # 커스텀 포트
npm run build                 # 프로덕션 빌드
npm run start                 # 프로덕션 서버
npm run build && npm run start # 로컬에서 프로덕션 테스트
```

### 코드 품질
```bash
npm run type-check            # TypeScript 검증
npm run lint                  # ESLint 검사
npm run lint:fix              # 린팅 이슈 자동 수정
npm run prettier              # 포맷 검사
npm run prettier:fix          # 코드 자동 포맷
```

### 테스팅
```bash
# 유닛 테스트 (Jest)
npm run test                  # 모든 테스트 실행
npm run test:watch            # Watch 모드
npm run test:coverage         # 커버리지 리포트
npm run test -- path/to/test  # 특정 테스트 파일
npm run test -- --testPathPattern=api/auth  # 패턴 매칭

# E2E 테스트 (Playwright)
npm run test:e2e              # E2E 테스트 실행
npm run test:e2e:ui           # 인터랙티브 UI 모드
npm run test:e2e:headed       # 브라우저 표시

# Storybook
npm run storybook             # 개발 서버 (port 6006)
npm run build-storybook       # Storybook 정적 빌드
npx vitest run                # 컴포넌트 테스트

# 배포 전 검증
npm run build && npm run type-check && npm run lint
```

### API 테스팅
```bash
curl http://localhost:3000/api/health        # 헬스 체크
curl http://localhost:3000/api/db-test       # 데이터베이스 연결 테스트
```

## 프로젝트 구조

### 주요 디렉토리
```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API 라우트 (auth, v1, health, docs)
│   ├── configurator/        # 3D 커스터마이저 페이지
│   └── [other pages]        # Cart, login, profile, etc.
├── components/
│   ├── ui/                  # 기본 UI 컴포넌트 (shadcn/ui)
│   ├── three/               # 3D 컴포넌트 (ThreeCanvas, DeskModel)
│   └── [feature components] # Auth, cart, pricing, designs, drawing
├── lib/
│   ├── api/                 # API 유틸리티 (auth, cache, rate-limit, validation)
│   ├── three/               # Three.js 유틸리티 (geometry, materials, controls)
│   ├── pricing/             # 가격 계산 엔진
│   ├── cart/                # 장바구니 로직
│   └── drawing/             # PDF 생성
└── types/                    # TypeScript 타입 정의
```

## API 아키텍처

### 엔드포인트 구조
```
/api/
├── auth/                     # 인증
│   ├── login (POST)
│   ├── logout (POST)
│   ├── register (POST)
│   ├── session (GET)
│   └── profile (GET/PUT)
├── v1/                       # 버전 관리 API (인증 필요)
│   ├── bff/configurator     # 통합 커스터마이저 데이터
│   ├── cart/                # 장바구니 작업
│   ├── checkout/            # 구매 플로우
│   ├── designs/             # 디자인 CRUD
│   ├── drawings/generate    # PDF 생성
│   └── pricing/calculate    # 가격 계산
├── health/                   # 헬스 체크
├── db-test/                 # 데이터베이스 테스트
└── docs/                     # Swagger 문서
```

### API 보안
- 보호된 라우트를 위한 JWT 인증
- 모든 입력에 대한 Zod 검증
- Rate limiting (장바구니 작업: 5-10 req/min)
- CSRF 토큰 보호
- 데이터베이스 Row Level Security

## 3D 시스템 및 재질

### 지원 재질 (6종)
- **Wood** (원목): coefficient 1.0
- **MDF**: coefficient 0.8
- **Steel** (스틸): coefficient 1.15
- **Metal** (메탈): coefficient 1.5
- **Glass** (유리): coefficient 2.0
- **Fabric** (패브릭): coefficient 0.8

### 가격 계산 공식
`가격 = 가로 × 세로 × 높이 × 재질_계수`

### 성능 요구사항
- 모바일: 최소 30 FPS
- 500ms 디바운싱을 통한 실시간 가격 업데이트
- Vercel 서버리스 배포에 최적화

## 데이터베이스 스키마

### 핵심 테이블
- `saved_design` - 가격, 도면, 장바구니 필드가 포함된 사용자 디자인
- `pricing_policies` - 재질 가격 규칙
- `purchase_requests` - 구매 기록
- `drawing_jobs` - 비동기 PDF 생성
- `user_profiles` - 확장 사용자 정보

### 스토리지
- 버킷: `drawings` - PDF 도면 저장소

## 환경 변수

`.env.local`에 필요:
```bash
# 데이터베이스 (필수)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 애플리케이션 (필수)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=
CSRF_SECRET=

# 선택사항
JWT_SECRET=
OPENAI_API_KEY=
```

## 테스팅 요구사항

### 커버리지 목표
- **전역**: 80% lines, 70% branches/functions
- **API 라우트** (`src/app/api/**`): 90% lines, 80% branches
- **라이브러리** (`src/lib/**`): 95% lines, 85% branches

### 테스트 구조
```
__tests__/
├── api/          # API 라우트 테스트
├── lib/          # 라이브러리 테스트
├── components/   # 컴포넌트 테스트
├── integration/  # 통합 테스트
├── performance/  # 성능 테스트
└── e2e/          # Playwright E2E 테스트
```

## 개발 워크플로우

### 스토리 주도 개발
프로젝트는 BMad Method™를 따르며 완료된 에픽:
- ✅ Epic 1: Platform Infrastructure (Stories 1.1-1.4)
- ✅ Epic 2: 3D Configurator Core (Stories 2.1-2.2)
- ✅ Epic 3: Pricing & Purchase Integration (Stories 3.1, 3.3A.1)
- ✅ Epic 4: Drawing Generation & Design Management (Story 4.1)
- ✅ Epic 5: Extended Materials System (integrated in 2.2)
- 🔄 Epic 3.4A: Global Type/Quality Stabilization (Story 3.4A.1 진행 중)

### BMad 에이전트 명령어
```bash
/BMad:agents:sm    # 스토리 생성
/BMad:agents:po    # 스토리 검증
/BMad:agents:dev   # 개발
/BMad:agents:qa    # 품질 보증
```

### 문서 위치
- User Stories: `docs/stories/`
- Architecture: `docs/architecture/`
- PRD: `docs/prd.md`
- QA Gates: `docs/qa/gates/`
- BMad Config: `.bmad-core/`

## 주요 개발 패턴

### BFF (Backend for Frontend)
- 위치: `/api/v1/bff/`
- 목적: 프론트엔드를 위한 여러 서비스 통합
- 예시: `/api/v1/bff/configurator`는 재질, 치수, 가격 정보를 통합

### 에러 핸들링
- `src/lib/api/errors.ts`를 통한 표준화된 에러 응답
- React 컴포넌트용 에러 바운더리
- 환경 기반 레벨을 가진 종합적인 로깅

### 캐싱 전략
- 일반 데이터: 5분 TTL 메모리 캐시
- 가격 정책: 1시간 캐시
- 엔드포인트별 API 응답 캐싱 설정

### 성능 최적화
- 3D 컴포넌트 코드 스플리팅
- `next.config.js`에서 번들 최적화
- 서버리스 콜드 스타트 워밍업 전략
- WebP/AVIF 지원 이미지 최적화

## 일반적인 문제 해결

### 데이터베이스 연결 문제
1. `.env.local`에 올바른 Supabase 자격증명이 있는지 확인
2. `curl http://localhost:3000/api/db-test`로 테스트
3. Supabase 대시보드에서 RLS 정책 확인

### 3D 성능 문제
1. Three.js 버전이 정확히 r169인지 확인
2. `src/lib/three/performance.ts`의 성능 도구로 FPS 모니터링
3. 재질 텍스처가 최적화되었는지 확인

### 빌드 실패
1. 전체 검증 실행: `npm run build && npm run type-check && npm run lint`
2. Node.js 버전이 v20.x인지 확인
3. 캐시 정리: `rm -rf .next node_modules && npm install`

### 타입 체크 문제
1. 참고: `tsconfig.json`은 타입 체크에서 `__tests__/**`를 제외 (테스트는 Jest로 검증)
2. 테스트 파일의 경우: 필요시 `@ts-nocheck` 지시어 사용, 하지만 타입 수정을 우선
3. Next.js App Router 충돌의 경우: 테스트 가능한 로직을 별도 유틸리티 파일로 추출 (예: `src/lib/api/bff-configurator-utils.ts` 참고)

## 빠른 참조

### 경로 별칭
- `@/*` → `src/*` (모든 임포트에 사용)

### 중요 파일
- API 미들웨어: `src/middleware.ts`
- Auth 컨텍스트: `src/lib/auth-context.tsx`
- Supabase 클라이언트: `src/lib/supabase.ts`
- Supabase 서버: `src/lib/supabase/server.ts`
- BFF 유틸리티: `src/lib/api/bff-configurator-utils.ts`
- Three.js 설정: `src/components/three/ThreeCanvas.tsx`
- 가격 엔진: `src/lib/pricing/`

### 배포
- 플랫폼: Vercel
- 빌드 명령: `npm run build`
- 설치 명령: `npm install`
- Node.js 버전: 20.x
