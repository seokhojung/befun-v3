# Stories 문서 가이드

본 프로젝트는 그린필드/브라운필드 작업을 stories 폴더에 함께 관리합니다. 혼선 방지를 위해 다음 네이밍 규칙을 따릅니다.

## 네이밍 규칙

- 그린필드: `N.M.slug.md`
  - 예: `2.1.3d-configurator-foundation.md`
- 브라운필드(보강/수정): `N.MX.slug.md` (X= A/B/C…)
  - 예: `2.2A.pricing-api-bug-fix.md`, `3.2A.cart-normalization.md`
- 브라운필드 스토리 파일(세부 작업): `{epic}.{story}.{slug}.story.md`
  - 예: `2.3A.1.desk-model-spec.story.md`, `3.2A.1.server-authoritative-cart.story.md`

## 위치

- 루트: `docs/stories` (core-config의 devStoryLocation)

## 권장 워크플로

1) 에픽(그린/브라운) 문서 생성 → 2) 스토리 분할(`epic-<N.MX>-story-<k>.md`) → 3) 스토리 검증/개발/QA

## 참고

- 브라운필드 문서는 기존 기능 보강/수정임을 명확히 하기 위해 A/B/C 서픽스를 사용합니다.
- 실행 우선순위는 `INDEX.md`를 참고하세요.
