# [Epic 3.2A] 장바구니 정상화 — Brownfield Enhancement

> Created as a small brownfield epic (1–3 stories). Brownfield suffix A denotes enhancement to an existing greenfield track.

## Epic Goal

서버 권위 가격 검증과 일관된 카트 API/프런트 흐름으로 “장바구니 추가 → 요약” 경로를 신뢰 가능하게 복구한다.

## Existing System Context

- Current relevant functionality: 로그인/회원가입 정상, 컨피규레이터 동작(가격/재질/사이즈 정의 일부 미흡), 카트 플로우 실패
- Technology stack: Next.js(App Router) + TypeScript, Supabase, Three.js r169, Jest/Playwright
- Integration points: `src/app/api/v1/cart/**`, `src/lib/pricing/**`, `src/app/api/v1/bff/configurator/route.ts`, 프런트 컨피규레이터/카트 상태

## Enhancement Details

- What’s being added/changed
  - add/update/remove/get 라우트/DTO 정리
  - 서버측 가격 재계산(공용 계산기)으로 단일 진실원(서버) 확립
  - 프런트 상태/오류 흐름 정렬(낙관적 업데이트 최소화, 서버 응답으로 재동기화)
- How it integrates
  - 카트 API가 `lib/pricing/calculator`를 경유해 금액 확정 → 프런트는 서버 응답만 신뢰
- Success criteria
  - 카트 API 2xx/스키마 일관, 동일 옵션에서 컨피규레이터 가격과 카트 확정 가격 일치
  - E2E “로그인 → 컨피그 → 카트 → 요약” 통과(총 소요 < 3s)

## Stories (1–3)

1. 서버 권위 가격 재검증 + 카트 API 정렬
   - add/update 시 `priceCalculator`로 금액 확정, DTO: `{id, options, unitPrice, quantity, lineTotal, currency}`
   - A/C: 모든 카트 엔드포인트 2xx·스키마 스냅샷 고정, 잘못된 가격/옵션 4xx + 명확 코드
2. 프런트 카트 상태/흐름 정리
   - 컨피규레이터→카트 추가 500ms 디바운스 확인, 낙관적 업데이트 최소화, 서버 응답으로 재동기화
   - A/C: 중복 추가/수량 변경/삭제 UX 정상, 에러 토스트/롤백 일관
3. 카트 E2E 시나리오 추가
   - 로그인→옵션 선택→카트 추가→합계 검증→수량 변경/삭제
   - A/C: CI 안정 통과, 총합=Σ(lineTotal), 소요시간 < 3s

## Compatibility Requirements

- [ ] Existing APIs remain unchanged (경로 유지, 스키마 문서화)
- [ ] Database schema changes are backward compatible (필요 시 마이그레이션/기본값)
- [ ] UI follows existing patterns (상태 관리/토스트/라우팅)
- [ ] Performance impact is minimal (카트 API < 200ms, 전체 시나리오 < 3s)

## Risk Mitigation

- Primary Risk: 프런트 임시 가격 vs 서버 확정 가격 불일치로 UX 혼란
- Mitigation: 서버 권위 원칙, 프런트 가격은 표시용(서버 응답 즉시 반영), 피처 플래그로 점진 릴리스
- Rollback Plan: 플래그로 신규 검증 비활성화, 이전 DTO 호환 핸들러 유지

## Definition of Done

- [ ] 카트 API 유닛/통합 테스트 통과(스키마 스냅샷 포함)
- [ ] E2E “로그인→컨피그→카트→요약” 통과
- [ ] 타입/문서 업데이트(`src/types`, API 명세)
- [ ] 회귀 없음(로그인/컨피그 여전히 성공)

## Validation Checklist (Brownfield Size)

- [ ] Epic can be completed in 1–3 stories maximum
- [ ] No architectural documentation required (기존 패턴 준수)
- [ ] Integration complexity is manageable (App Router + Supabase 표준 흐름)
- [ ] Risk to existing system is low (플래그/롤백 준비)

## Story Manager Handoff

본 에픽은 Next.js/TS/Supabase 기반 카트 플로우를 서버 권위 가격 검증으로 복구합니다.

- Integration points: `api/v1/cart/**`, `lib/pricing/calculator`, 컨피그→카트 프런트 상태
- Patterns: App Router API routes, Zod 입력 검증, 공용 계산기 경유
- Critical compatibility: 엔드포인트 경로 유지, 응답 스키마 문서화/스냅샷
- 각 스토리는 기존 기능 무결성 검증을 포함해야 합니다.
