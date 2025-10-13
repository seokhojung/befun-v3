# 코딩 규약 요약 (프로젝트 표준)

본 문서는 BMAD devLoadAlwaysFiles에 의해 개발 에이전트가 항상 참고하는 최소 표준입니다. 상세 규약은 리포지토리 전역 가이드와 ESLint/Prettier 설정을 따릅니다.

## 언어/환경
- Node.js 20.x LTS
- TypeScript + Next.js (App Router)
- 경로 별칭: `@/*`

## 포매팅(Prettier)
- 2 스페이스 들여쓰기, 홑따옴표, 세미콜론 미사용, 줄 폭 100
- 스크립트: `npm run prettier` / `npm run prettier:fix`

## 린트(ESLint)
- 베이스: `next/core-web-vitals`
- 주요 규칙: `prefer-const`, `no-var`
- 스크립트: `npm run lint` / `npm run lint:fix`

## 네이밍/파일 규칙
- 컴포넌트: `PascalCase.tsx`
- 훅/유틸: 케밥 케이스(e.g., `use-debounce.ts`)
- 레거시 이름은 유지

## 타입/테스트
- 타입 체크: `npm run type-check`
- 테스트: Jest + Testing Library(JSdom), 커버리지 목표: br 70 / fn 70 / lines 80 / statements 80 (api/lib는 상향)

## 기타
- 비밀값은 `.env.local`에만 저장, 커밋 금지
- Three.js r169 고정, 목표 배포: Vercel serverless

