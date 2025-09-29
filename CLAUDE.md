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

# Build and type checking
npm run build
npm run type-check

# Code quality
npm run lint
npm run lint:fix
npm run prettier
npm run prettier:fix
```

### 테스팅
```bash
# Unit tests (Jest)
npm run test
npm run test:watch
npm run test:coverage

# Single test file
npm run test -- path/to/test.test.ts

# API-specific tests
npm run test -- __tests__/api/

# Performance tests
npm run test -- __tests__/performance/

# Component tests
npm run test -- __tests__/components/

# Storybook tests (Vitest)
npx vitest run
```

### Storybook
```bash
npm run storybook
npm run build-storybook
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
- **BFF Pattern**: `/api/v1/bff/` - Backend For Frontend endpoints
- **Versioned APIs**: `/api/v1/` - All business logic APIs
- **Auth**: `/api/auth/` - Authentication endpoints
- **Documentation**: `/api/docs/` - Swagger/OpenAPI docs

### 컴포넌트 구조
```
src/components/
├── ui/           # Reusable UI primitives (shadcn/ui based)
├── layout/       # Layout components (header, footer, container)
├── auth/         # Authentication-specific components
├── form/         # Form components and wrappers
├── three/        # 3D rendering components (Three.js)
└── pricing/      # Pricing system components
```

### 라이브러리 구조
```
src/lib/
├── api/          # API utilities (auth, validation, errors, rate limiting)
├── three/        # Three.js utilities (geometry, materials, controls)
├── pricing/      # Pricing calculation engine
└── utils.ts      # General utilities
```

### 테스트 커버리지 요구사항
- **Global**: 80% lines, 70% branches/functions
- **API Routes** (`src/app/api/**`): 90% lines, 80% branches
- **Libraries** (`src/lib/**`): 95% lines, 85% branches

## 스토리 기반 개발 워크플로우

### 현재 상태
- **Epic 1**: ✅ Platform infrastructure (Stories 1.1-1.4)
- **Epic 2**: ✅ 3D configurator core (Stories 2.1-2.2)
- **Epic 3**: 🔄 Pricing & purchasing integration (Story 3.1 in progress)
- **Epic 4**: 📋 Design management & drawing generation
- **Epic 5**: 📋 Extended materials system

### 스토리 상태
- **Draft** → **Approved** → **InProgress** → **Review** → **Done**

### 파일 위치
- **Stories**: `docs/stories/` - User stories with AC and technical details
- **PRD**: `docs/prd.md` - Product requirements document
- **Architecture**: `docs/architecture/` - Technical architecture docs

## 3D 시스템 통합

### Three.js 컴포넌트
- **ThreeCanvas**: Main 3D rendering container
- **DeskModel**: Desk geometry and materials management
- **Materials**: Wood, MDF, Steel, Metal, Glass, Fabric support
- **Performance**: 30 FPS minimum on mobile, optimized for Vercel serverless

### 가격 시스템 통합
- **Real-time calculation**: 500ms debouncing for option changes
- **Volume-based pricing**: width × depth × height × material_modifier
- **6 materials supported**: wood(1.0), mdf(0.8), steel(1.15), metal(1.5), glass(2.0), fabric(0.8)

## 데이터베이스 및 보안

### Supabase 설정
- **Authentication**: Row Level Security (RLS) enabled
- **Core table**: `saved_design` with pricing fields from Story 2.2
- **New tables**: `pricing_policies`, `purchase_requests` (Story 3.1)

### 보안 정책
- **RLS**: Users access only their own data
- **API Security**: Rate limiting (分당 5회 for cart operations)
- **Validation**: Zod schemas for all API inputs
- **CSRF**: Token-based protection

## BMad Agent System

This project uses BMad™ agents for development workflow automation:

### Available Agents
- **sm** (Scrum Master): Story creation and refinement
- **po** (Product Owner): Story validation and backlog management
- **dev** (Developer): Implementation
- **qa** (QA): Quality assurance and testing
- **pm** (Project Manager): Project coordination

### Agent Usage
```bash
# Activate agents with slash commands
/BMad:agents:sm    # Story creation
/BMad:agents:po    # Story validation
/BMad:agents:dev   # Development
/BMad:agents:qa    # Quality assurance
```

### 언어 사용 정책
- **BMad method 절차**: 모든 절차와 상호작용을 **한국어**로 진행
- **파일명**: 영어로 통일 (예: `user-authentication-system.md`)
- **문서 내용**: 한국어로 작성
- **기술 용어**: 영어 원문 병기 가능 (예: "인증 시스템 (Authentication System)")

### Agent Files Location
```
.bmad-core/
├── tasks/         # Executable workflows
├── templates/     # Document templates
├── checklists/    # Validation checklists
└── core-config.yaml  # Project configuration
```

### CRITICAL: 절차 준수 원칙

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

## 외부 통합

### 쇼핑카트 통합 (Epic 3)
- **Strategy**: Simple redirect model (not complex API integration)
- **External API**: Redirect to existing shopping mall for payment
- **Data flow**: Design → Cart API → External shop URL

### API 디자인 패턴
- **BFF Endpoints**: Aggregate multiple services for frontend
- **Error Handling**: Standardized error responses with fallbacks
- **Caching**: Memory caching for pricing policies (1-hour TTL)

## 개발 베스트 프랙티스

### 코드 품질
- **TypeScript strict mode**: All code must pass strict type checking
- **ESLint**: Next.js configuration with custom rules
- **Prettier**: Automatic code formatting
- **Path aliases**: Use `@/` for src/ imports

### 테스팅 전략
- **Jest**: Unit tests with Next.js integration and jsdom environment
- **Vitest**: Storybook integration tests with Playwright browser testing
- **Testing Library**: React component testing
- **MSW**: API mocking for integration tests
- **Performance tests**: Separate test suite for 3D rendering performance
- **Test timeout**: 10 seconds for complex 3D operations

### 성능 요구사항
- **3D Rendering**: 30 FPS minimum on mobile
- **API Response**: 500ms maximum for pricing calculations
- **Cold Start**: Warm-up strategies for serverless functions
- **Bundle Size**: Code splitting for 3D components