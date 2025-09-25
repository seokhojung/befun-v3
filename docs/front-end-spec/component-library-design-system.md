# Component Library / Design System

## 디자인 시스템 접근법 (Design System Approach)

  * **코드 기반 디자인 시스템**: **Tailwind CSS**를 기반으로 하는 **Shadcn/ui**와 같은 솔루션을 활용합니다.
  * **Figma 활용**: Figma에서 **재사용 가능한 컴포넌트 라이브러리**를 구축하여 디자인 가이드라인을 시각적으로 관리합니다.

## 핵심 컴포넌트 (Core Components) 최종안

| 컴포넌트 | 용도 및 기능 | 중요한 상태/변형 |
| :--- | :--- | :--- |
| **버튼 (Button)** | 사용자 액션에 사용됩니다. | Primary, Secondary, Disabled 상태 |
| **슬라이더 (Slider)** | 책상의 크기 조절의 주요 입력 도구입니다. | 정밀한 값 입력을 위해 **수치 입력기(Numeric Input)**와 결합되어야 합니다. |
| **토스트 메시지 (Toast Message)** | '디자인이 저장되었습니다'와 같은 성공 피드백을 표시합니다. | Success, Error, Warning 유형 |
