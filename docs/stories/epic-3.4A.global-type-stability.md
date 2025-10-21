# [Epic 3.4A] 전역 타입/품질 안정화 — Brownfield Quality

## Summary

리포 전역의 TypeScript 타입 오류 및 빌드/테스트 품질 경고를 체계적으로 제거하여 개발 속도와 신뢰성을 회복합니다. 린트/타입체크/테스트와 연계된 품질 게이트를 다시 Green 상태로 복구하는 것이 목표입니다.

## Goals

- `npm run type-check` 전역 무오류(0 errors)
- 핵심 테스트 스위트 PASS 상태 회복(우선순위-정의 기반)
- 린트 규칙 준수 및 자동 수정 적용 범위 확대(비파괴적)

## Out of Scope

- 기능 변경/신규 기능 추가(타입/테스트 정상화 목적 범위 내에서 최소화)

## Notes

- 본 에픽은 브라운필드(보강/수정) 성격으로, 스토리별로 영역을 슬라이스(예: api, lib, components, tests)하여 단계적으로 추진합니다.

