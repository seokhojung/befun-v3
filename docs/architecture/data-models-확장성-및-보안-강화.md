# Data Models (확장성 및 보안 강화)

## Saved_Design (핵심 모델)

  * **`custom_specs`**: `JSONB` 타입으로 저장 (유연성 확보).
  * **핵심 속성 분리**: `width_cm`, `depth_cm`, `material` 등 **검색/분석에 사용될 핵심 속성**은 별도 컬럼으로 분리하여 **DB 쿼리 성능을 향상**합니다.
  * **RLS (Row Level Security)**: **Supabase의 RLS 정책**을 활성화하여 로그인한 사용자만 자신의 디자인 데이터에 접근하도록 **보안을 강화**합니다.
