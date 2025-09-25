# Next Steps

## UX Expert Sally에게 전달할 최종 프롬프트

**UX Expert Sally:**

**Task**: 이 PRD와 UI/UX 사양을 기반으로, 다음 핵심 지침을 포함하는 상세한 **UI/UX 사양(front-end-spec.md)**을 최종 확정해 주십시오.

1. **3D 지연 UX 전략**: Serverless Cold Start 지연에 대응하여 **스켈레톤 UI** 및 **명확한 메시지**를 사용하는 UX 전략을 구체적으로 정의합니다.
2. **3D 조작 민감도 기준**: 모바일 터치 및 데스크톱 마우스 조작에 대한 **수치적 민감도 기준**을 명시하여 개발팀의 조작감 구현을 가이드합니다.
3. **컴포넌트 명세**: Tailwind CSS 및 Shadcn/ui 기반의 **핵심 컴포넌트 명세**를 최종 확정합니다.

## Architect Winston에게 전달할 최종 프롬프트

**Architect Winston:**

**Task**: 이 PRD와 최종 UI/UX 사양을 기반으로 **Fullstack Architecture Document**를 최종 확정해 주십시오. 다음 핵심 설계 전략이 **Serverless Functions** 및 **Supabase** 환경에 완벽하게 구현되도록 상세한 지침을 제공해 주십시오.

1. **통합 및 보안**: **BFF 도입**, **토큰 기반 보안 중계 로직**을 통해 레거시 쇼핑몰과의 연동 보안을 확보합니다.
2. **성능 및 비용**: **Warm-up 전략** 및 **비동기 도면 생성 로직**을 포함하는 Serverless 환경의 성능 및 비용 문제를 해결합니다.
3. **데이터 모델**: **RLS(Row Level Security) 설정** 및 **핵심 속성 분리**를 포함하는 DB 스키마 생성 스토리를 명확히 정의합니다.