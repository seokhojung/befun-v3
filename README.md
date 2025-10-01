# BeFun v3 - 3D 책상 컨피규레이터

## 프로젝트 개요
3D 책상 컨피규레이터 플랫폼

## 기술 스택
- **Frontend**: Next.js 14.x + TypeScript 5.3.x
- **Styling**: Tailwind CSS 3.x
- **Database**: Supabase (PostgreSQL 15)
- **Hosting**: Vercel

## 개발 환경 설정

### 필수 요구사항
- Node.js v20.x LTS

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 타입 체크
npm run type-check
```

### 환경 변수 설정

#### 1. Supabase 프로젝트 생성
1. [Supabase Dashboard](https://supabase.com/dashboard)에 접속
2. "New Project" 클릭하여 프로젝트 생성
3. 프로젝트 생성 완료 후 **Settings** → **API** 메뉴로 이동

#### 2. API 키 복사
**Project API keys** 섹션에서 다음 값들을 복사:
- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`에 사용
- **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 사용
- **service_role key**: `SUPABASE_SERVICE_ROLE_KEY`에 사용 (⚠️ **절대 공개 금지**)

#### 3. `.env.local` 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 복사한 값들을 입력:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

⚠️ **보안 주의사항**:
- `.env.local` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 이미 포함됨)
- `SERVICE_ROLE_KEY`는 서버 사이드에서만 사용하세요
- 프로덕션 환경에서는 Vercel Environment Variables를 사용하세요

## 프로젝트 구조
```
src/
├── app/              # Next.js App Router
│   ├── api/         # API 라우트
│   ├── globals.css  # 전역 스타일
│   ├── layout.tsx   # 루트 레이아웃
│   └── page.tsx     # 홈 페이지
├── components/       # 재사용 가능한 컴포넌트
├── lib/             # 라이브러리 및 유틸리티
├── types/           # TypeScript 타입 정의
└── utils/           # 헬퍼 함수
```