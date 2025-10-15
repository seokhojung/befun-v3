# [Epic 2.4A] 실시간 가격/사이즈 검증·UX — Brownfield Enhancement

> Debounced real-time pricing, Zod validation with bounds/snap, and improved material UX (preload/preview).

## Epic Goal

컨피규레이터의 실시간 상호작용을 안정화하기 위해 500ms 디바운스 가격 호출, 파라미터 검증(Zod), 사이즈 스냅/경계 적용, 재질 프리로드/프리뷰 UX를 제공한다.

## Existing System Context

- Current relevant functionality: 실시간 가격/재질 변경 일부 가능하나 검증/스냅/프리로드 미흡
- Technology stack: React/Next.js, Zod, Three.js, Hooks
- Integration points: `src/hooks/use-pricing.ts`, `src/lib/api/validation.ts`, 컨피그 UI 컴포넌트

## Enhancement Details

- What’s being added/changed
  - 500ms 디바운스 + 중복요청 취소
  - 입력 검증(Zod) + 범위/스냅 강제
  - 재질 텍스처 프리로드/프리뷰, 플레이스홀더 적용
- How it integrates
  - 훅/유효성 레이어에서 통일 → 렌더/가격 호출은 검증 통과 후만
- Success criteria
  - 경계 위반 시 즉시 UX 피드백, 유효 입력에서 가격/렌더 지연 최소

## Stories (1–3)

1. 디바운스/요청 취소 통합
   - `use-pricing` 디바운스/AbortController 적용
   - A/C: 급격한 입력에도 불필요 호출 없음, 최신 결과만 반영
2. Zod 검증 + 스냅 규칙 적용
   - 입력 스키마/스냅 구현(예: 10mm), 오류 메시지 일관
   - A/C: 유효/무효 케이스 테스트, UI 경계 가이드 표시
3. 재질 UX(프리로드/프리뷰)
   - 텍스처 프리로드 훅, 프리뷰 썸네일/플레이스홀더 도입
   - A/C: 전환 지연/깜빡임 최소, 네트워크 오류 폴백

## Compatibility Requirements

- [ ] API 계약 준수, 호출 빈도 제한 고려
- [ ] 성능 영향 최소(메모리/CPU)

## Risk Mitigation

- Primary Risk: 과도한 호출/메모리 증가
- Mitigation: 디바운스/취소/프리로드 관리, 메모리 측정
- Rollback Plan: 기능 토글로 순차 적용

## Definition of Done

- [ ] 유닛/통합 테스트 통과, UX 시연 OK
- [ ] 성능 기준 만족(p95 < 500ms)

## Validation Checklist (Brownfield Size)

- [ ] 1–3 스토리 내 완료
- [ ] 기존 패턴 준수

## Story Manager Handoff

실시간 상호작용 품질을 높이기 위한 디바운스/검증/재질 UX 개선을 구현합니다.

- Integration: `hooks/use-pricing`, `lib/api/validation`
- Critical: 최신 요청만 반영, 경계 위반 UX 명확
## Goals & Value
- Realtime 검증/UX로 컨피규레이터 사용성을 향상하고, 서버 권위(검증/가격)를 즉시 반영
- 사용자 입력(치수/재질/마감)에 대한 스냅/경계 피드백을 3D로 시각화

## Success Metrics
- 모바일 FPS ≥ 30, 초기화 ≤ 3s
- 인터랙션 변경→가격 업데이트 p95 ≤ 500ms (디바운스 500ms 포함)
- 검증 실패 시 422 + 표준 메시지 포맷 즉시 표출
- 서버 계산 가격과 UI 표시 가격 완전 일치

## Story Breakdown (2.4A.x)
1) 2.4A.1 DeskModel MVP (파라메트릭 상판+다리, 스냅/경계 피드백, 30FPS)
2) 2.4A.2 Realtime UX (슬라이더/키보드, 에러/경고 UX, 썸네일 캡처)
3) 2.4A.3 BFF Sync (제약/재질/룰 초기화, 캐시 워밍 확인)

## Dependencies
- 2.3A.1 모델 스펙/검증(Zod), 2.3A.2 표준 가격 산식(V2), 2.3A.3 재질 카탈로그/워밍

## Risks & Mitigations
- 성능 저하 → 인스턴싱/LOD/컬링(2.5A로 확장)
- 텍스처/재질 정확도 ↔ 성능 트레이드오프 → MVP는 단색+러프니스, 옵션화

## Definition of Done
- [ ] 2.4A.1~3 스토리 게이트 PASS
- [ ] 성공 지표(FPS/초기화/반응시간/일치성) 근거 로그 첨부
