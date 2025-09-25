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

### 환경 변수
`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

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