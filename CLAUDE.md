# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 코드 작업을 할 때의 가이드라인을 제공합니다.

## 프로젝트 개요

BeFun v3는 **3D 책상 컨피규레이터 플랫폼** (3D Desk Configurator Platform)으로, 사용자가 실시간 3D 시각화, 즉시 가격 책정, 구매 통합을 통해 책상을 맞춤 설정할 수 있는 플랫폼입니다. 이 플랫폼은 인프라, 3D 컨피규레이터, 가격/구매, 디자인 관리, 확장 재료를 다루는 5개의 주요 에픽으로 구성된 스토리 중심 개발 접근 방식을 따릅니다.

## 아키텍처

- **스타일**: Vercel에 최적화된 Serverless + Monorepo 아키텍처
- **패턴**: API 추상화를 위한 BFF (Backend For Frontend)
- **프론트엔드**: Next.js 14.x + 3D 렌더링을 위한 Three.js r169
- **백엔드**: Node.js 서버리스 함수 + Supabase (PostgreSQL 15)
- **보안**: RLS (Row Level Security) + Supabase Auth + CSRF 보호

## 개발 명령어

### 핵심 개발
```bash
# Development server
npm run dev
PORT=3001 npm run dev          # 특정 포트에서 실행

# Build and deployment
npm run build                  # 프로덕션 빌드
npm run start                  # 프로덕션 서버 시작
npm run build && npm run start # 로컬 프로덕션 테스트

# Code quality
npm run type-check             # TypeScript 타입 검사
npm run lint                   # ESLint 검사
npm run lint:fix               # ESLint 자동 수정
npm run prettier               # Prettier 포맷 검사
npm run prettier:fix           # Prettier 자동 수정

# 배포 전 전체 검증
npm run build && npm run type-check && npm run lint
```

### 테스팅

#### 단위 테스트 (Jest)
```bash
npm run test                   # 전체 테스트 실행
npm run test:watch             # Watch 모드
npm run test:coverage          # 커버리지 리포트

# 특정 테스트 실행
npm run test -- path/to/test.test.ts
npm run test -- __tests__/api/
npm run test -- __tests__/components/
npm run test -- __tests__/performance/

# 패턴으로 필터링
npm run test -- --testPathPattern=api/auth
npm run test -- --testPathPattern=three

# 디버그 모드
node --inspect-brk node_modules/.bin/jest __tests__/api/auth/login.test.ts
```

#### E2E 테스트 (Playwright)
```bash
npm run test:e2e              # E2E 테스트 실행
npm run test:e2e:ui           # Interactive UI 모드
npm run test:e2e:headed       # 브라우저 표시
```

#### Storybook 테스트 (Vitest)
```bash
npm run storybook             # Storybook 개발 서버
npm run build-storybook       # Storybook 빌드
npx vitest run                # Storybook 테스트
```

#### CI 환경 시뮬레이션
```bash
npm run test:coverage && npm run type-check && npm run lint
```

### 데이터베이스 및 헬스체크
```bash
# Supabase 연결 테스트
curl http://localhost:3000/api/db-test

# 헬스체크
curl http://localhost:3000/api/health
```

## 주요 기술 제약사항

### 버전 요구사항 (중요)
- **Node.js**: v20.x LTS only
- **Next.js**: 14.x (specific for Vercel optimization)
- **Three.js**: r169 (fixed version for stability)
- **TypeScript**: 5.3.x (strict mode enabled)

### 환경 변수
`.env.local`에 필요 (`.env.example` 참조):
```
# Database (필수)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# Application (필수)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
CSRF_SECRET=your_csrf_secret_here

# Optional
JWT_SECRET=your_jwt_secret_here
OPENAI_API_KEY=your_openai_api_key_here
```

## 프로젝트 구조 및 패턴

### API 아키텍처
- **BFF 패턴**: `/api/v1/bff/` - 프론트엔드를 위한 백엔드 엔드포인트
- **버전 관리 API**: `/api/v1/` - 모든 비즈니스 로직 API
- **인증**: `/api/auth/` - 인증 엔드포인트
- **문서화**: `/api/docs/` - Swagger/OpenAPI 문서

### API 엔드포인트 목록
```
/api/
├── auth/
│   ├── login       - POST: 사용자 로그인
│   ├── logout      - POST: 로그아웃
│   ├── register    - POST: 회원가입
│   ├── session     - GET: 세션 확인
│   └── profile     - GET/PUT: 프로필 조회/수정
├── v1/
│   ├── bff/
│   │   └── configurator  - 3D 컨피규레이터 BFF 엔드포인트
│   ├── cart/             - 장바구니 API
│   ├── checkout/         - 결제 프로세스
│   ├── designs/          - 디자인 저장/조회
│   ├── drawings/         - 도면 생성
│   │   └── generate      - POST: PDF 도면 생성
│   ├── pricing/          - 가격 계산
│   │   └── calculate     - POST: 실시간 가격 계산
│   └── profile/          - 사용자 프로필
├── db-test/              - GET: DB 연결 테스트
├── docs/                 - Swagger/OpenAPI 문서
└── health/               - GET: 헬스체크
```

**참고**: 모든 `/api/v1/` 엔드포인트는 인증 필요 (세션 토큰)

### 컴포넌트 구조
```
src/components/
├── ui/           # 재사용 가능한 UI 기본 요소 (shadcn/ui 기반)
├── layout/       # 레이아웃 컴포넌트 (헤더, 푸터, 컨테이너)
├── auth/         # 인증 관련 컴포넌트
├── form/         # 폼 컴포넌트 및 래퍼
├── three/        # 3D 렌더링 컴포넌트 (Three.js)
├── pricing/      # 가격 시스템 컴포넌트
├── cart/         # 장바구니 UI 컴포넌트
├── designs/      # 디자인 관리 컴포넌트
└── drawing/      # 도면 생성 컴포넌트
```

### 라이브러리 구조
```
src/lib/
├── api/          # API 유틸리티 (인증, 검증, 오류 처리, 속도 제한)
├── three/        # Three.js 유틸리티 (지오메트리, 재질, 컨트롤)
├── pricing/      # 가격 계산 엔진
├── cart/         # 장바구니 로직 및 외부 API 연동
├── drawing/      # PDF 도면 생성 엔진
├── utils/        # 공유 유틸리티 (재료, 변환 등)
└── utils.ts      # 일반 유틸리티
```

### 테스트 커버리지 요구사항
- **전체**: 80% 라인, 70% 분기/함수
- **API 라우트** (`src/app/api/**`): 90% 라인, 80% 분기
- **라이브러리** (`src/lib/**`): 95% 라인, 85% 분기

## 스토리 기반 개발 워크플로우

### 현재 상태
- **Epic 1**: ✅ 플랫폼 인프라 (Stories 1.1-1.4)
- **Epic 2**: ✅ 3D 컨피규레이터 핵심 (Stories 2.1-2.2, Epic 5 재료 포함)
- **Epic 3**: ✅ 가격 및 구매 통합 (Story 3.1 완료)
- **Epic 4**: ✅ 디자인 관리 및 도면 생성 (Story 4.1 완료)
- **Epic 5**: ✅ 확장 재료 시스템 (Story 2.2에 통합 완료)
- **Epic 6**: ⏸️ 개발 환경 및 배포 인프라 개선 (도커 컨테이너화) - **계획됨, 미구현**

**📊 Epic 1-5 완료 - 핵심 기능 프로덕션 준비 완료**
**⏳ Epic 6 (도커 환경) 미구현 - NFR4 요구사항 미충족**

### 프로젝트 완료 상태
**총 구현 스토리: 8개 완료**
- Epic 1: Stories 1.1-1.4 (플랫폼 인프라) ✅
- Epic 2: Stories 2.1-2.2 (3D 컨피규레이터, 6개 재료 지원) ✅
- Epic 3: Story 3.1 (장바구니/결제) ✅
- Epic 4: Story 4.1 (도면 생성/디자인 관리) ✅

**모든 PRD 요구사항 충족:**
- ✅ FR1: 3D 컨피규레이터 (재료 6종: 원목, MDF, 스틸, 메탈, 유리, 패브릭)
- ✅ FR2: 실시간 가격 계산
- ✅ FR3: 도면 생성 및 다운로드
- ✅ FR4: 구매 연동
- ✅ FR5: 계정 관리

### 스토리 상태
- **Draft** → **Approved** → **InProgress** → **Review** → **Done**

### 파일 위치
- **스토리**: `docs/stories/` - 수락 기준 및 기술 세부사항이 포함된 사용자 스토리
- **QA Gates**: `docs/qa/gates/` - 각 스토리별 QA 검증 결과
- **PRD**: `docs/prd.md` - 제품 요구사항 문서
- **아키텍처**: `docs/architecture/` - 기술 아키텍처 문서

## 3D 시스템 통합

### Three.js 컴포넌트
- **ThreeCanvas**: 메인 3D 렌더링 컨테이너
- **DeskModel**: 책상 지오메트리 및 재질 관리
- **재료**: 원목, MDF, 스틸, 메탈, 유리, 패브릭 지원
- **성능**: 모바일 최소 30 FPS, Vercel 서버리스에 최적화

### 가격 시스템 통합
- **실시간 계산**: 옵션 변경 시 500ms 디바운싱
- **부피 기반 가격**: 너비 × 깊이 × 높이 × 재료_계수
- **지원 재료 6종**: 원목(1.0), MDF(0.8), 스틸(1.15), 메탈(1.5), 유리(2.0), 패브릭(0.8)

## 데이터베이스 및 보안

### Supabase 설정
- **인증**: 행 수준 보안 (RLS) 활성화
- **핵심 테이블**: `saved_design` (가격, 도면, 장바구니 필드 포함)
- **추가 테이블**: `pricing_policies`, `purchase_requests`, `drawing_jobs`
- **Storage**: `drawings` 버킷 (PDF 도면 저장)

### 보안 정책
- **RLS**: 사용자는 자신의 데이터만 접근 가능
- **API 보안**: 장바구니 작업에 대해 분당 5회 속도 제한
- **검증**: 모든 API 입력에 대한 Zod 스키마
- **CSRF**: 토큰 기반 보호

## BMad 에이전트 시스템

이 프로젝트는 개발 워크플로우 자동화를 위해 BMad™ 에이전트를 사용합니다.

### ⚠️ CRITICAL: 절차 준수 원칙

**어떤 이유로든 정해진 절차를 생략하거나 건너뛰지 않습니다.**

#### 필수 준수 사항
1. **워크플로우 완전 준수**: BMad 에이전트별 워크플로우의 모든 단계를 순서대로 완료
2. **체크리스트 완전 이행**: 각 단계의 체크리스트 항목을 모두 확인 후 다음 단계로 진행
3. **에이전트 역할 존중**: 각 에이전트의 고유 절차와 책임을 완전히 준수
4. **사용자 승인 필수**: 중요한 단계는 반드시 사용자 확인 후 진행
5. **효율성 핑계 금지**: 효율성을 이유로 절차를 임의로 생략하거나 단축 금지

#### 위반 시 즉시 중단
- 절차 생략이 발견되면 즉시 작업 중단
- 누락된 절차를 완전히 수행한 후 진행
- 사용자에게 위반 사실을 보고하고 승인 요청

### 사용 가능한 에이전트
- **sm** (스크럼 마스터): 스토리 생성 및 세분화
- **po** (제품 책임자): 스토리 검증 및 백로그 관리
- **dev** (개발자): 구현
- **qa** (품질 보증): 품질 보증 및 테스트
- **pm** (프로젝트 관리자): 프로젝트 조정

### 에이전트 사용법
```bash
# 슬래시 명령어로 에이전트 활성화
/BMad:agents:sm    # 스토리 생성
/BMad:agents:po    # 스토리 검증
/BMad:agents:dev   # 개발
/BMad:agents:qa    # 품질 보증
```

### 언어 사용 정책
- **BMad method 절차**: 모든 절차와 상호작용을 **한국어**로 진행
- **파일명**: 영어로 통일 (예: `user-authentication-system.md`)
- **문서 내용**: 한국어로 작성
- **기술 용어**: 영어 원문 병기 가능 (예: "인증 시스템 (Authentication System)")

### 에이전트 파일 위치
```
.bmad-core/
├── tasks/         # 실행 가능한 워크플로우
├── templates/     # 문서 템플릿
├── checklists/    # 검증 체크리스트
└── core-config.yaml  # 프로젝트 설정
```

## 외부 통합

### 쇼핑카트 통합
- **전략**: 단순 리다이렉트 모델
- **외부 API**: 기존 쇼핑몰로 리다이렉트
- **데이터 흐름**: 디자인 → 장바구니 API → 외부 쇼핑몰 URL

### API 디자인 패턴
- **BFF 엔드포인트**: 여러 서비스 집계
- **오류 처리**: 폴백 포함 표준화 응답
- **캐싱**: 가격 정책 메모리 캐싱 (1시간 TTL)

## 개발 베스트 프랙티스

### 코드 품질
- **TypeScript strict 모드**: 엄격한 타입 검사
- **ESLint**: Next.js 설정 + 커스텀 규칙
- **Prettier**: 자동 포맷팅
- **경로 별칭**: `@/` 사용 (src/ 임포트)

### 성능 목표
- **3D 렌더링**: 모바일 최소 30 FPS
- **API 응답**: 가격 계산 최대 500ms
- **서버리스**: 콜드 스타트 웜업 전략
- **번들**: 코드 스플리팅 적용