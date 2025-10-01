# 🚀 BMAD Method™ 그린필드 스토리 구현 검증 진행 절차

## 📋 개요
BMAD Method™의 그린필드 프로젝트에서는 **SM(Scrum Master) → Dev(Developer) → QA(Quality Assurance)** 순서로 진행되는 체계적인 개발 워크플로우를 사용합니다. 각 에이전트가 전문 영역에 집중하여 최고 품질의 결과물을 만들어내는 핵심 메커니즘입니다.

---

## 🔄 전체 워크플로우 개요

```
📝 Step 1: SM - 스토리 생성 (Draft)
    ↓
👤 Step 2: PO - 스토리 검토 (Approved)
    ↓
💻 Step 3: Dev - 개발 구현 (Review)
    ↓
🧪 Step 4: QA - 품질 검증 (Done)
    ↓
🔄 다음 스토리로 반복
```

---

## 📝 Step 1: 스토리 생성 (SM 에이전트)

### 🎯 목적
- PRD 문서를 기반으로 구체적인 개발 작업 단위인 "스토리"를 생성
- Epic의 순서에 따라 다음에 구현할 스토리를 자동 선택

### 🚀 실행 방법

#### **새로운 채팅 세션 시작**
```
@sm
```

#### **명령어 선택**
- **`*create`**: 샤딩된 핵심문서를 보고 처음 스토리를 작성할 때
- **`*draft`**: 다음 스토리를 작성할 때 (지난 스토리 문서를 보고 진행에 맞게 다음 스토리 작성)

### 📋 SM 에이전트가 수행하는 작업

1. **📚 문서 분석**
   - 샤드된 PRD 문서에서 다음 스토리 생성
   - Epic 순서에 따라 자동으로 다음 스토리 선택
   - 이전 스토리들의 Dev Agent Record와 QA Results 참조

2. **📝 스토리 문서 생성**
   - 스토리 상태: **"Draft"**로 생성
   - 파일 위치: `docs/stories/[epic].[story].*.md`
   - 예시: `docs/stories/2.2.real-time-pricing-system.md`

3. **📖 스토리 내용 구성**
   ```markdown
   # Story 2.2: 실시간 가격 시스템
   
   ## 상태: Draft
   
   ## 스토리
   As a 사용자,
   I want 제품 옵션 변경 시 실시간으로 가격을 확인할 수 있게
   So that 구매 결정을 빠르게 내릴 수 있다
   
   ## Acceptance Criteria
   1. 옵션 변경 시 즉시 가격 업데이트
   2. 로딩 상태 표시
   3. 에러 처리 및 폴백
   
   ## Dev Notes (SM이 작성)
   - 참조: Story 1.3 (API 패턴)
   - 참조: Story 2.1 (3D 컨피규레이터 연동)
   - WebSocket 또는 Server-Sent Events 고려
   ```

---

## 👤 Step 2: 스토리 검토 (PO 에이전트)

### 🎯 목적
- 생성된 스토리가 비즈니스 요구사항과 기술적 실현 가능성을 만족하는지 검증
- 승인 또는 수정 요청 결정

### 🚀 실행 방법

#### **새로운 채팅에서 또는 계속해서**
```
@po
```

#### **검증 명령어**
```
*validate-story-draft {스토리 문서 이름}
```

### 📋 PO 에이전트가 수행하는 작업

1. **✅ 승인 시**
   - 스토리 상태: **"Approved"**로 변경
   - 다음 단계(Dev)로 진행 가능

2. **❌ 거부 시 (No Go 상태)**
   - 문제점 분석 및 피드백 제공
   - `*correct-course` 명령 실행 필요

### 🔄 수정 프로세스 (No Go → Go)

#### **`*correct-course` 명령 실행 조건**
다음 경우에만 실행:
- 새로운 근본적 충돌 발견
- Sprint Change Proposal이 부적절함
- 프로젝트 방향성 재검토 필요

#### **수정 후 재검증**
```
validate-story-draft docs/stories/2.2.real-time-pricing-system.md
```

#### **최종 승인 후**
```
*doc-out
```
- 최종 승인된 문서 출력

---

## 💻 Step 3: 개발 구현 (Dev 에이전트)

### 🎯 목적
- 승인된 스토리를 실제 코드로 구현
- 모든 변경사항을 체계적으로 문서화

### 🚀 실행 방법

#### **새로운 채팅 세션 시작**
```
@dev
```

#### **개발 명령어**
```
*develop-story
```
- 스토리 작업을 순차적으로 구현하고 테스트

### 📋 Dev 에이전트가 수행하는 작업

1. **🔧 구현 작업**
   - 승인된 스토리의 Acceptance Criteria 구현
   - 이전 스토리들의 Dev Agent Record 참조하여 패턴 적용
   - 필요한 라이브러리 및 의존성 설치

2. **📝 문서 업데이트**
   - 모든 변경사항을 File List에 업데이트
   - Dev Agent Record 섹션에 구현 과정 기록

3. **✅ 완료 처리**
   - 완료 시 스토리 상태: **"Review"**로 변경
   - QA 검토 준비 완료

### 📄 Dev Agent Record 예시
```markdown
## Dev Agent Record

### 완료 노트
- 실시간 가격 계산 API 구현 완료
- WebSocket 연결로 실시간 업데이트 구현
- Story 1.3의 API 패턴 적용
- Story 2.1의 3D 컨피규레이터와 연동

### 파일 목록
- 생성: src/lib/api/pricing-realtime.ts
- 생성: src/hooks/use-realtime-pricing.ts
- 수정: src/components/pricing/PricingDisplay.tsx
- 수정: src/app/configurator/page.tsx
```

---

## 🧪 Step 4: QA 검토 (QA 에이전트)

### 🎯 목적
- 구현된 코드의 품질 검증
- 소규모 이슈 직접 수정
- 남은 작업 항목 체크리스트 제공

### 🚀 실행 방법

#### **새로운 채팅 세션 시작**
```
@qa
```

#### **검토 명령어**
```
*review [스토리파일명]
```

### 📋 QA 에이전트가 수행하는 작업

1. **🔍 코드 검토**
   - 구현된 코드의 품질 평가
   - 보안, 성능, 테스트 커버리지 검증
   - 이전 스토리들과의 일관성 확인

2. **🔧 직접 수정**
   - 소규모 이슈는 QA가 직접 수정
   - 큰 문제는 Dev에게 수정 요청

3. **📊 상태 결정**
   - 스토리 상태: **"Review → Done"** 또는 **"Review"** 유지
   - QA Results 섹션에 상세한 평가 기록

### 🔄 수정이 필요한 경우

#### **Dev에게 수정 요청**
```
*dev -> *review-qa
```

### 📄 QA Results 예시
```markdown
## QA Results

### 품질 평가
- 성능: ✅ 실시간 업데이트 < 100ms 달성
- 보안: ✅ WebSocket 연결 인증 구현
- 테스트: ✅ 95.2% 커버리지 달성
- 접근성: ⚠️ 스크린 리더 지원 개선 필요

### Gate Status
Gate: CONCERNS → docs/qa/gates/2.2-realtime-pricing.yml

### 남은 작업
- [ ] 접근성 개선 (aria-live 영역 추가)
- [ ] 에러 바운더리 강화
- [ ] 성능 모니터링 추가
```

---

## 🔄 반복 사이클: SM → Dev → QA

### 📈 전체 프로젝트 진행

```
Story 1.1: SM → Dev → QA
Story 1.2: SM → Dev → QA
Story 1.3: SM → Dev → QA
Story 2.1: SM → Dev → QA
Story 2.2: SM → Dev → QA
...
```

### 🎯 핵심 원칙

1. **🔄 순차적 진행**: 반드시 SM → Dev → QA 순서 준수
2. **📝 문서화**: 모든 과정을 스토리 문서에 기록
3. **🎭 역할 분리**: 각 에이전트는 전문 영역에만 집중
4. **✅ 검증**: 각 단계마다 품질 검증 수행

### 📚 지식 축적 메커니즘

각 스토리가 완료될 때마다:
- **Dev Agent Record**: 구현 과정과 발견된 패턴
- **QA Results**: 품질 평가와 개선 사항
- **다음 스토리**: 이전 지식들이 자동으로 반영

---

## 💡 실무 팁

### ✅ **Best Practices**

1. **🎯 하나씩 집중하기**
   - 한 번에 하나의 스토리만 진행
   - 다른 스토리로 넘어가기 전에 완전히 완료

2. **🔄 깨끗한 컨텍스트 유지**
   - SM, Dev, QA는 항상 새 채팅으로 시작
   - 컨텍스트 오염 방지

3. **📝 상세한 문서화**
   - Dev Agent Record에 모든 변경사항 기록
   - QA Results에 구체적인 평가 기준 명시

4. **🧪 철저한 검증**
   - 각 스토리 완료 후 반드시 QA 검증
   - 문제 발견 시 즉시 수정

### ⚠️ **주의사항**

1. **❌ 역할 혼동 금지**
   - SM은 개발하지 않음
   - Dev는 스토리 생성하지 않음
   - QA는 아키텍처 설계하지 않음

2. **❌ 순서 건너뛰기 금지**
   - 반드시 Draft → Approved → InProgress → Review → Done

3. **❌ 문서 없이 개발 금지**
   - 승인된 스토리 문서 없이 개발 시작 금지

---

## 🚀 시작하기

### 📋 **첫 스토리 진행 예시**

```bash
# 1. 스토리 생성
@sm
*create

# 2. 스토리 검토
@po
*validate-story-draft docs/stories/1.1.project-setup.md

# 3. 개발 구현
@dev
*develop-story

# 4. QA 검증
@qa
*review docs/stories/1.1.project-setup.md
```

---

## 📚 워크플로우 참조

### 🔄 반복 개발 사이클
```
step: repeat_development_cycle
action: continue_for_all_stories
notes: |
  Repeat story cycle (SM → Dev → QA) for all epic stories        
  Continue until all stories in PRD are complete
```

**반복 사이클**: SM → Dev → QA → SM → Dev → QA...

이 워크플로우를 통해 BMAD Method™는 체계적이고 품질 높은 소프트웨어 개발을 가능하게 합니다. 각 에이전트가 전문 영역에 집중하여 최고의 결과물을 만들어내는 것이 핵심입니다! 🎉