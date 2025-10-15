# [Epic 2.5A] 3D 최적화/관측성 — Brownfield Enhancement

> Code-splitting/lazy, scene/memory tuning, and runtime metrics/logging to sustain 30fps and <500ms API.

## Epic Goal

3D 컨피규레이터의 성능과 안정성을 높이기 위해 코드 스플릿/지연 로딩, 장면/메모리 최적화, 관측성(메트릭/로깅)을 도입한다.

## Existing System Context

- Current relevant functionality: 3D 렌더 동작, 일부 성능/메모리 이슈 가능
- Technology stack: React/Next.js, Three.js r169, Logger
- Integration points: 3D 컴포넌트, 로거/타이머, 상태 페이지(`/api/v1/status`)

## Enhancement Details

- What’s being added/changed
  - 코드 스플릿/지연 로딩, SSR off(필요 시)
  - LOD/지오메트리 단순화/가비지 수거 루틴
  - 요청 타이머/성능 메트릭/에러 융합 로그
- How it integrates
  - 3D UI 컴포넌트 구조 리팩터 + 로거 유틸 통합
- Success criteria
  - 모바일 30fps 유지, 주요 API 응답 < 500ms, 메모리 증가량 임계 내

## Stories (1–3)

1. 코드 스플릿/지연 로딩 도입
   - 큰 3D 모듈 분리, 초화면 렌더 최소화
   - A/C: 초기 JS 크기 감소, TTI 개선
2. 장면/메모리 최적화
   - LOD/지오메트리 경량화, 해제 루틴, 텍스처 캐시 관리
   - A/C: 메모리 증가량 테스트 임계 내(예: < 100MB)
3. 관측성 강화
   - 요청 타이머/메트릭 노출, 에러 융합 로깅
   - A/C: `/api/v1/status`에 핵심 지표 반영, 경고 임계 설정

## Compatibility Requirements

- [ ] UI 패턴 준수, 사용자 경험 유지
- [ ] 성능 회귀 방지, 측정 기반 개선

## Risk Mitigation

- Primary Risk: 분할/지연 로딩 부작용(깜빡임/UX 저하)
- Mitigation: 프리로드 포인트/스켈레톤 도입, 측정/튜닝 반복
- Rollback Plan: 분할 전 구성으로 즉시 복구 가능

## Definition of Done

- [ ] 성능/메모리/UX 목표 달성(30fps, <500ms)
- [ ] 관련 테스트/문서 갱신

## Validation Checklist (Brownfield Size)

- [ ] 1–3 스토리 내 완료
- [ ] 기존 구조/패턴 준수

## Story Manager Handoff

3D 성능/안정성을 위한 분할·장면 최적화·관측성을 도입합니다.

- Integration: 3D 컴포넌트 트리, 로거/메트릭
- Critical: 수치 기반 개선, 회귀 방지
