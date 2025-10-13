# 기술 스택 요약 (프로젝트 표준)

본 문서는 BMAD devLoadAlwaysFiles 기본 참조용 요약입니다. 세부 내역/결정 근거는 `docs/architecture/tech-stack-안정-버전-확정.md` 및 `docs/architecture.md`를 참고하세요.

## 프레임워크/런타임
- Next.js (App Router) + React 18
- Node.js 20.x LTS

## 언어/도구
- TypeScript
- Tailwind CSS
- Jest + Testing Library, Playwright(E2E)

## 3D/시각화
- Three.js r169(핀 고정)

## 데이터/백엔드
- Supabase(RLS 준수, JWT+CSRF, 민감 액션 레이트 리밋 5–10 req/min)
- BFF 패턴, 입력 검증 Zod

## 품질/자동화
- ESLint(`next/core-web-vitals`), Prettier, TypeCheck
- 스크립트: `npm run lint|lint:fix|prettier|prettier:fix|type-check|test`

## 문서 링크
- 상세 스택 결정: `docs/architecture/tech-stack-안정-버전-확정.md`
- 상위 아키텍처: `docs/architecture.md`

