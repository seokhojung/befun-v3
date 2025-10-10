## Dev Debug Log (BMAD Core)

### 2025-10-02

- Story 2.2A – Pricing API 단위 변환/에러 처리 보강
  - 변경: Configurator m→cm 변환(초기/변경/재시도), Pricing API ZodError optional chaining/VALIDATION_FAILED 코드 반영, 헤더 세팅 가드
  - 테스트: pricing/calculate 테스트 모킹이 500 고정 → 4xx 기대 불일치로 실패 확인, 테스트 정렬 계획 수립
  - 콘솔로그: 00console-error-log.txt 기반 PurchaseSection null 참조 오류 재현 및 가드 적용
- Story 1.2D – 긴급 안정화 보완
  - 변경: ConfiguratorUI에서 cartData null 가드 추가(런타임 에러 제거)
  - 메모: 무한 루프 재현 경로 구체화 필요, Profiler 기반 리팩토링 대기

### 2025-10-10

- Story 1.2D – 초기화 경로 보강
  - 변경: ThreeCanvas에 onInitError 콜백 추가(WebGL 미지원/초기화 오류 시 부모에 통지)
  - 변경: ConfiguratorUI에 handleSceneError 및 Init Watchdog(5s) 추가 → 무한 로딩 방지
  - 로그: onSceneReady 수신/Watchdog 동작 콘솔 로그 추가
  - 추가: ThreeCanvas 초기화 단계별 로깅(setMount, init start, webgl 여부, setWebglSupported, renderer append, controls 생성, onSceneReady 호출, 첫 프레임 렌더)
  - 추가: ThreeCanvas 렌더 분기 수정 – 항상 캔버스 렌더 + 오버레이(로딩/에러)
- Story 1.2E – 마이그레이션 스크립트 골격 추가
  - 추가: docs/scripts/migrate-user-profiles.sql, check-user-profiles.sql, create-single-user-profile.sql, bulk-migrate-users.sql
  - 메모: 트리거 보강/로깅/테스트는 후속 작업
