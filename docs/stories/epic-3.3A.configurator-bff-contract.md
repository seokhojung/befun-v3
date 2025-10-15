# [Epic 3.3A] 컨피규레이터 BFF 계약 정렬 — Brownfield Enhancement

> Configurator BFF response contract, query ordering, caching, and concurrency behavior aligned with tests and frontend expectations.

## Epic Goal

컨피규레이터 BFF의 응답 스키마(camelCase)와 쿼리 순서를 고정하고, 부분 실패 경고/캐시/동시성 동작을 표준화하여 안정적인 초기화 데이터를 제공한다.

## Existing System Context

- Current relevant functionality: BFF 구현 존재하나 스키마/순서/캐시/동시성 불일치로 테스트 실패
- Technology stack: Next.js(App Router) + TypeScript, Supabase, Zod, Jest
- Integration points: `src/app/api/v1/bff/configurator/route.ts`, `src/lib/api/cache`, `src/lib/api/validation`, `src/lib/pricing/**`

## Enhancement Details

- What’s being added/changed
  - 응답 스키마를 camelCase 표준(`data.materials`, `data.pricingRules`, `data.savedDesigns`, `data.preferences`, `data.quotaStatus`)으로 고정
  - 쿼리 호출 순서 고정: materials → pricing_rules → saved_designs → user_profiles
  - 부분 실패 시 `warnings[]` 포함, 빈 배열 폴백
  - 캐시 히트 경로/헤더 설정 및 동시성(10요청) 안정화
- How it integrates
  - BFF 라우트 내 계약/순서 정렬 → 프런트/테스트와 일치
  - 캐시 유틸/레이트리밋 헤더 일관 적용
- Success criteria
  - 관련 Jest 테스트 100% 통과, 동시 10요청 < 3s, 응답 < 500ms

## Stories (1–3)

1. BFF 응답 스키마/쿼리 순서 정렬
   - camelCase 키 고정, 호출 순서 보장, 스키마 스냅샷 업데이트
   - A/C: 테스트의 키/순서/타입 기대치 100% 일치
2. 부분 실패/캐시/헤더 표준화
   - materials/pricing/desgins/profile 모듈러 try-catch, `warnings[]` 폴백
   - 캐시 미스→셋→히트 경로 검증, X-RateLimit* 헤더 설정
   - A/C: “부분 실패 처리/캐시 활용” 테스트 통과
3. 동시성/성능 안정화
   - 10개 병렬 요청 처리, 공유 상태 없음 보장, 불필요 재계산 방지
   - A/C: 동시성 테스트(호출수/시간) 통과, p95 < 500ms

## Compatibility Requirements

- [ ] Existing API path remains (경로/버전 유지)
- [ ] 응답 스키마 문서화 및 스냅샷 고정
- [ ] 성능 영향 최소화(캐시/쿼리 정리)

## Risk Mitigation

- Primary Risk: 프런트/테스트 기대와 스키마 미스매치
- Mitigation: 스냅샷/타입 동기화, 계약 문서화, 피처 플래그로 점진 적용 가능
- Rollback Plan: 기존 스키마/핸들러 분기 유지로 즉시 롤백

## Definition of Done

- [ ] BFF 테스트 전부 통과
- [ ] 계약 문서/타입 정리 및 코드 주석 반영
- [ ] 성능/동시성 기준 만족

## Validation Checklist (Brownfield Size)

- [ ] 1–3 스토리 내 완료 가능
- [ ] 기존 패턴 준수(App Router, 캐시 유틸)
- [ ] 리스크/롤백 경로 명확

## Story Manager Handoff

컨피규레이터 BFF 라우트의 스키마·순서·캐시·동시성 정렬을 수행합니다.

- Integration points: `api/v1/bff/configurator`, `lib/api/cache`, `lib/api/validation`
- Patterns: Zod 검증, 캐시/레이트리밋 헤더, warnings 폴백
- Critical: 테스트 기대 스키마/순서와 완전 일치 필요
