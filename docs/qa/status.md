# QA Status Dashboard (Brownfield)

Updated: 2025-10-10

- 1.2D React 무한 로딩/루프 — Gate: CONCERNS
  - Evidence: `__tests__/components/configurator/ConfiguratorUI.regression.test.tsx` (added)
  - Notes: jsdom 환경에서 Three.js 객체 미사용 경로로 회귀 보장. 실기기 교차 확인 권장.
- 2.2 실시간 가격 계산 — Gate: CONCERNS
  - Evidence: `__tests__/api/v1/pricing/calculate.test.ts` (다수 500 실패)
  - Suspected: 테스트 하네스/모킹 순서/경합, 응답 헤더 set 가드, Zod 400 경계 재확인 필요
  - Next: 로거/CONFIG no-op 유지, `createSuccessResponse`/`createErrorResponse` 모킹 일관화, 최신 실행 녹색 확인
- 2.1 3D 컨피규레이터 기반 — Gate: CONCERNS
  - Evidence: `__tests__/components/three/ThreeCanvas.test.tsx` (jsdom canvas 제한으로 실패)
  - Next: 캔버스 폴리필 또는 WebGL 모킹 라이브러리 사용, 실측 FPS 로그 캡처
- 1.2E 프로필 마이그레이션 — Gate: FAIL
  - Evidence: `docs/scripts/migrate-user-profiles.sql` 템플릿 추가됨
  - Next: 드라이런 리포트/실행 로그/트리거 예외 테스트 작성

Process
- Source of Truth: 각 `docs/stories/*`의 "QA Results" 섹션 (게이트/증거/권고 기록)
- Gate Files: 별도 yml 필요 시에만 생성. 현재는 스토리 내부 QA Results만 사용.
- Test Scope: 기능(2.2), 회귀(1.2D), 성능 스냅샷(2.1) 우선. 데이터(1.2E)는 스크립트/리포트 중심.

Next Actions (QA)
- [ ] 2.2 최신 스펙만 단독 실행해 녹색 확인
- [ ] 1.2D/2.1 jsdom 캔버스 모킹 개선 또는 실기기 로그 확보
- [ ] 1.2E 드라이런 리포트 산출(누락=0), 실행 로그 테이블 스냅샷
