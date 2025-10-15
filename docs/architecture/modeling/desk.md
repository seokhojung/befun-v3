# Desk Parametric Model Spec (v1)

Status: Draft
Owner: Platform
Applies to: Configurator, Pricing, Cart (Server-authoritative)

## Overview
- 목적: 컨피규레이터와 서버 가격 계산의 단일 진실원(SSOT) 확보를 위해 책상(Desk) 파라메트릭 모델을 문서/타입/검증으로 잠금
- 범위: 치수(폭/깊이/높이), 스냅 정책, 단위, 재질/마감, 색상

## Constraints
- width_cm: 30–300
- depth_cm: 30–300
- height_cm: 40–120
- material: wood | mdf | steel | metal | glass | fabric
- finish: matte | glossy | satin
- color: HEX #RRGGBB

## Snap Policy
- v1 정책: 엄격(Strict)
  - 단위: cm 고정
  - 스냅: 1cm (정수 cm만 허용)
  - 보정: 없음(소수 입력 시 422 ValidationError)

## Examples
Valid
```
{
  "width_cm": 120,
  "depth_cm": 60,
  "height_cm": 75,
  "material": "wood",
  "finish": "matte",
  "color": "#8B4513"
}
```

Invalid (examples)
```
{
  "width_cm": 15,       // too small
  "depth_cm": 500,      // too large
  "height_cm": 35,      // too small
  "material": "plastic",// unsupported
  "finish": "ultra",   // unsupported
  "color": "brown"     // not hex
}
```

## Error Messages (KR)
- "입력값이 올바르지 않습니다: width_cm - 허용 범위 30–300"
- "입력값이 올바르지 않습니다: material - 지원되지 않는 재질입니다"
- "입력값이 올바르지 않습니다: color - 올바른 색상 코드 형식이 아닙니다(예: #112233)"

## FAQ
- Q: mm/inch 단위는?
  - A: 본 버전 범위 외. 변환 로직은 후속 스토리에서 정의
- Q: 스냅 보정 지원?
  - A: v1은 보정 없음(엄격). 후속 스토리로 옵션화 가능

