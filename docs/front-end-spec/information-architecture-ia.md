# Information Architecture (IA)

## Site Map / Screen Inventory
```mermaid
graph TD
    A[홈페이지] --> B[컨피규레이터]
    A --> C[마이페이지]
    A --> D[장바구니]
    C --> C1[저장된 디자인 목록]
    C --> C2[계정 설정]
    D --> D1[결제]
    B --> B1[도면 생성]
    B --> B2[디자인 저장]
```

## User Flows

#### 핵심 사용자 흐름: 책상 커스터마이징 및 구매

```mermaid
sequenceDiagram
    participant User
    participant Configurator
    participant Cart
    participant Checkout

    User->>Configurator: 책상 커스터마이징 시작
    Configurator-->>User: 실시간 3D 모델 및 가격 정보 표시
    User->>Configurator: 옵션 변경
    alt 옵션 호환 문제 발생
        Configurator-->>User: 오류 메시지 표시 (예: "이 옵션은 다른 부품과 호환되지 않습니다.")
    end
    User->>Configurator: "장바구니 담기" 선택
    Configurator->>Cart: 커스터마이징된 제품 데이터 전달
    Cart-->>User: 장바구니 화면으로 이동
    User->>Checkout: "결제하기" 선택
    Checkout-->>User: 결제 화면 표시
```

## Edge Cases 및 오류 처리

  * **미로그인 사용자의 디자인 저장**: 로그인하지 않은 사용자가 '디자인 저장' 버튼을 누르면, **먼저 로그인 또는 회원가입을 유도**하는 팝업 메시지를 표시합니다.
  * **옵션 호환성 오류**: 특정 옵션이 다른 옵션과 호환되지 않을 경우, 오류를 발생시키기보다 **호환 가능한 옵션만 활성화**하여 사용자 실수를 사전에 방지합니다.
