# [Epic 2.3A] 책상 도메인/가격 룰 확정 — Brownfield Enhancement

> Define authoritative desk parametric model, pricing rules, and materials catalog (types + seeds) for consistent behavior across configurator/cart.

## Epic Goal

책상 파라메트릭 모델, 가격 룰, 재질 카탈로그를 “단일 진실원”으로 문서+타입+시드에 고정하여 모든 기능(컨피그/카트)의 일관성을 확보한다.

## Existing System Context

- Current relevant functionality: 컨피규레이터/가격 계산기 존재하나 경계/룰/재질 정의 미흡
- Technology stack: TS/Next.js, Supabase, Three.js, Zod
- Integration points: `src/types/pricing.ts`, `src/lib/pricing/**`, DB `materials/pricing_policies`

## Enhancement Details

- What’s being added/changed
  - 책상 모델 파라미터/제약(폭/깊이/높이 범위, 스냅, 최소/최대) 명시
  - 가격 룰: basePrice, sizeMultiplier, material/finish multipliers, VIP(사용자 티어) 룰 확정
  - 재질 카탈로그: id/표시명/기본단가/modifier/texture_url, 활성화 플래그
- How it integrates
  - 타입/스키마 업데이트 → 계산기/검증/Zod 반영 → BFF/카트가 동일 룰 사용
- Success criteria
  - 동일 옵션에서 컨피그/카트/테스트 가격 일치, 잘못된 입력은 검증 단계에서 차단

## Stories (1–3) — Status & Gate

1) 2.3A.1 책상 모델 스펙 문서화 및 타입/검증 반영 — Gate: PASS
- 문서/타입/Zod 스키마 일치. 메시지 표준 포맷 및 HTTP 422 적용.
- refs: docs/architecture/modeling/desk.md, src/types/desk.ts, src/lib/api/validation.ts

2) 2.3A.2 가격 룰 표준화 및 계산기 반영 — Gate: PASS
- 표준 산식(V2) 상수/타입/계산기 구현, 프런트 훅 로컬 계산 제거(서버 권위 단일 경로).
- refs: src/types/pricing.ts, src/lib/pricing/standard-calculator.ts, src/lib/pricing/index.ts

3) 2.3A.3 재질 카탈로그/시드 준비 — Gate: PASS
- 시드 SQL/픽스처/플레이스홀더 추가. BFF 필터(비활성/disabled 제외), 캐시 워밍 키(materials:list) 확인.
- refs: docs/scripts/seed-materials.sql, __tests__/fixtures/materials.json, public/materials/placeholder.png

## Compatibility Requirements

- [ ] 기존 API 경로 유지, DTO 변경 시 문서/타입 동기
- [ ] DB 변경 역호환, 시드/마이그레이션 제공

## Risk Mitigation

- Primary Risk: 룰/경계 변경으로 가격 변동
- Mitigation: 플래그/버전 필드로 이전 룰 유지 가능, 단계적 적용
- Rollback Plan: 이전 룰 테이블/설정으로 즉시 전환

## Definition of Done

- [x] 문서/타입/계산기/시드 정합성 확보
- [x] 관련 유닛/선택 통합 테스트 통과 (필터/상수/자산)

## Validation Checklist (Brownfield Size)

- [x] 1–3 스토리 내 완료 (모두 Gate PASS)
- [x] 기존 패턴 준수, 리스크/롤백 정의

## Story Manager Handoff

도메인 정의를 문서/타입/시드에 고정하여 모든 소비자가 동일 룰을 사용하도록 합니다.

- Integration: `types/pricing`, `lib/pricing/calculator`, DB 시드
- Critical: 경계/스냅/룰 명확, 테스트로 검증
