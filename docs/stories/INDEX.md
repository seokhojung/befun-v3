# Stories 인덱스 (우선순위/진행 순서)

본 인덱스는 에픽별 스토리 상태와 게이트 결과를 요약합니다. 경로 표기는 `docs/stories/...`로 통일합니다.

Legend

- Status: Draft | In Progress | Ready for Review | PASS (게이트 승인 반영 시 표시)
- Gate: PASS | CONCERNS | FAIL (docs/qa/gates 참조)

1. 2.3A — 책상 도메인/가격 룰 확정

- Epic: docs/stories/epic-2.3A.desk-domain-and-pricing-rules.md
- Stories
  - docs/stories/2.3A.1.desk-model-spec.story.md — Status: PASS, Gate: PASS
  - docs/stories/2.3A.2.pricing-rules-standardization.story.md — Status: PASS, Gate: PASS
  - docs/stories/2.3A.3.materials-catalog-seeding.story.md — Status: PASS, Gate: PASS

2. 2.4A — 실시간 가격/사이즈 검증·UX

- Epic: docs/stories/epic-2.4A.realtime-configurator-validation-and-ux.md
- Stories
  - docs/stories/2.4A.1.desk-model-mvp.story.md — Status: pass
  - docs/stories/2.4A.2.realtime-ux.story.md — Status: Draft
  - docs/stories/2.4A.3.bff-sync.story.md — Status: Draft

3. 2.5A — 3D 최적화/관측성

- Epic: docs/stories/epic-2.5A.3d-optimization-and-observability.md

4. 3.2A — 장바구니 정상화

- Epic: docs/stories/epic-3.2A.cart-normalization.md

5. 3.3A — 컨피규레이터 BFF 계약 정렬

- Epic: docs/stories/epic-3.3A.configurator-bff-contract.md

비고

- A 서픽스는 브라운필드(보강/수정) 문서를 의미합니다.
- 게이트 결과는 docs/qa/gates/에서 확인할 수 있습니다.
