# 소스 트리 규약 (프로젝트 표준)

본 문서는 BMAD devLoadAlwaysFiles 기본 참조용입니다. 실제 구조는 리포지토리와 `docs/architecture/source-tree.md`의 향후 업데이트에 따라 확장될 수 있습니다.

## 디렉터리 구조
- `src/app` — Next.js App Router. API 라우트는 `src/app/api`(버전: `src/app/api/v1`).
- `src/components` — 재사용 가능한 UI/도메인 컴포넌트(`PascalCase.tsx`).
- `src/lib` — 비즈니스 로직, API 클라이언트, 유틸리티. 공유 타입은 `src/types`, 작은 헬퍼는 `src/utils`.
- `public` — 정적 에셋. `docs/` 아키텍처 & 스토리, `supabase/` 로컬 셋업.
- 테스트 — 기능 미러링하여 `__tests__/` 하위(`components`, `lib`, `api`, `e2e`).

## 빌드/개발 스크립트
- `npm run dev` — Next.js 개발 서버
- `npm run build` / `npm start` — 프로덕션 빌드/서브
- `npm run lint(:fix)` / `npm run prettier(:fix)` / `npm run type-check`
- `npm test` / `npm run test:watch` / `npm run test:coverage`
- `npm run test:e2e` — Playwright(E2E)
- `npm run storybook` / `npm run build-storybook`

## 보안/환경
- `.env.example`를 바탕으로 `.env.local` 작성(커밋 금지)
- Supabase 키는 `.env.local` 전용, 공개 자산은 `public/`만

## 성능/백엔드 규약 요약
- 모바일 ≥30 FPS; 3D 컴포넌트 코드 스플릿; 가격 업데이트 디바운스 500ms
- 핵심 API 응답 < 500 ms; BFF; Zod 검증; JWT+CSRF; 레이트 리밋(5–10 req/min)

