안녕하세요! 저는 BMad-Method 프레임워크의 전문 AI 에이전트인 **비펀v3**입니다. 요청하신 대로, 이 번들에 포함된 모든 전문 에이전트와 그들이 사용할 수 있는 명령어를 에이전트별로 정리하여 알려드리겠습니다.

---

## 🎭 BMad Orchestrator (비엠에드 마스터 오케스트레이터)

**ID**: `bmad-orchestrator`
**사용 시기**: 워크플로 조정, 다중 에이전트 작업, 역할 전환 안내, 어떤 전문가를 찾아야 할지 확신이 서지 않을 때 사용됩니다.

| 명령어               | 설명                                                             |
| :------------------- | :--------------------------------------------------------------- |
| `*help`              | 사용 가능한 에이전트 및 워크플로와 함께 이 안내를 표시           |
| `*agent [name]`      | 전문 에이전트로 전환 (이름을 지정하지 않으면 목록 표시)          |
| `*chat-mode`         | 상세한 지원을 위한 대화 모드 시작                                |
| `*checklist [name]`  | 체크리스트 실행 (이름을 지정하지 않으면 목록 표시)               |
| `*doc-out`           | 전체 문서 출력                                                   |
| `*kb-mode`           | 전체 BMad 지식 기반 로드                                         |
| `*party-mode`        | 모든 에이전트와의 그룹 채팅                                      |
| `*status`            | 현재 컨텍스트, 활성 에이전트 및 진행 상황 표시                   |
| `*task [name]`       | 특정 작업 실행 (이름을 지정하지 않으면 목록 표시, 에이전트 필요) |
| `*yolo`              | 확인 건너뛰기 모드 토글                                          |
| `*exit`              | BMad로 돌아가거나 세션 종료                                      |
| `*workflow [name]`   | 특정 워크플로 시작 (이름을 지정하지 않으면 목록 표시)            |
| `*workflow-guidance` | 올바른 워크플로를 선택하는 데 도움이 되는 개인화된 안내 받기     |
| `*plan`              | 시작하기 전에 상세 워크플로 계획 생성                            |
| `*plan-status`       | 현재 워크플로 계획 진행 상황 표시                                |
| `*plan-update`       | 워크플로 계획 상태 업데이트                                      |

---

## 📊 Analyst (비즈니스 분석가)

**ID**: `analyst`
**사용 시기**: 시장 조사, 브레인스토밍, 경쟁사 분석, 프로젝트 브리프 작성, 초기 프로젝트 발견, 기존 프로젝트 문서화(브라운필드)에 사용됩니다.

| 명령어                       | 설명                                                                                 |
| :--------------------------- | :----------------------------------------------------------------------------------- |
| `help`                       | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시                             |
| `brainstorm {topic}`         | 구조화된 브레인스토밍 세션 진행 (facilitate-brainstorming-session.md 작업 실행)      |
| `create-competitor-analysis` | 경쟁사 분석 문서 생성 (create-doc 작업 및 competitor-analysis-tmpl.yaml 템플릿 사용) |
| `create-project-brief`       | 프로젝트 브리프 문서 생성 (create-doc 작업 및 project-brief-tmpl.yaml 템플릿 사용)   |
| `doc-out`                    | 진행 중인 전체 문서를 현재 대상 파일로 출력                                          |
| `elicit`                     | 고급 정보 추출(advanced-elicitation) 작업 실행                                       |
| `perform-market-research`    | 시장 조사 문서 생성 (create-doc 작업 및 market-research-tmpl.yaml 템플릿 사용)       |
| `research-prompt {topic}`    | 심층 연구 프롬프트 생성 (create-deep-research-prompt.md 작업 실행)                   |
| `yolo`                       | Yolo 모드 토글                                                                       |
| `exit`                       | 비즈니스 분석가로서 작별 인사를 하고 이 페르소나에서 벗어남                          |

---

## 📋 PM (제품 관리자)

**ID**: `pm`
**사용 시기**: PRD 생성, 제품 전략, 기능 우선순위 지정, 로드맵 계획 및 이해관계자 커뮤니케이션에 사용됩니다.

| 명령어                    | 설명                                                                               |
| :------------------------ | :--------------------------------------------------------------------------------- |
| `help`                    | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시                           |
| `correct-course`          | `correct-course` 작업 실행 (중요한 변경 사항 발생 시 경로 재설정)                  |
| `create-brownfield-epic`  | 브라운필드 프로젝트용 에픽 생성 (brownfield-create-epic.md 작업 실행)              |
| `create-brownfield-prd`   | 브라운필드 PRD 문서 생성 (create-doc 작업 및 brownfield-prd-tmpl.yaml 템플릿 사용) |
| `create-brownfield-story` | 브라운필드 프로젝트용 사용자 스토리 생성 (brownfield-create-story.md 작업 실행)    |
| `create-epic`             | 브라운필드 프로젝트용 에픽 생성 (brownfield-create-epic 작업 실행)                 |
| `create-prd`              | PRD 문서 생성 (create-doc 작업 및 prd-tmpl.yaml 템플릿 사용)                       |
| `create-story`            | 요구 사항으로부터 사용자 스토리 생성 (brownfield-create-story 작업 실행)           |
| `doc-out`                 | 전체 문서를 현재 대상 파일로 출력                                                  |
| `shard-prd`               | 제공된 `prd.md`에 대해 `shard-doc.md` 작업 실행 (파일을 찾지 못하면 문의)          |
| `yolo`                    | Yolo 모드 토글                                                                     |
| `exit`                    | 종료 (확인)                                                                        |

---

## 🎨 UX Expert (UX 전문가)

**ID**: `ux-expert`
**사용 시기**: UI/UX 디자인, 와이어프레임, 프로토타입, 프론트엔드 사양 및 사용자 경험 최적화에 사용됩니다.

| 명령어                  | 설명                                                                                |
| :---------------------- | :---------------------------------------------------------------------------------- |
| `help`                  | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시                            |
| `create-front-end-spec` | 프론트엔드 사양 문서 생성 (create-doc 작업 및 front-end-spec-tmpl.yaml 템플릿 사용) |
| `generate-ui-prompt`    | AI 프론트엔드 프롬프트 생성 (generate-ai-frontend-prompt.md 작업 실행)              |
| `exit`                  | UX 전문가로서 작별 인사를 하고 이 페르소나에서 벗어남                               |

---

## 🏗️ Architect (설계자)

**ID**: `architect`
**사용 시기**: 시스템 설계, 아키텍처 문서, 기술 선택, API 설계 및 인프라 계획에 사용됩니다.

| 명령어                           | 설명                                                                                             |
| :------------------------------- | :----------------------------------------------------------------------------------------------- |
| `help`                           | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시                                         |
| `create-backend-architecture`    | 백엔드 아키텍처 문서 생성 (create-doc 작업 및 architecture-tmpl.yaml 템플릿 사용)                |
| `create-brownfield-architecture` | 브라운필드 아키텍처 문서 생성 (create-doc 작업 및 brownfield-architecture-tmpl.yaml 템플릿 사용) |
| `create-front-end-architecture`  | 프론트엔드 아키텍처 문서 생성 (create-doc 작업 및 front-end-architecture-tmpl.yaml 템플릿 사용)  |
| `create-full-stack-architecture` | 풀스택 아키텍처 문서 생성 (create-doc 작업 및 fullstack-architecture-tmpl.yaml 템플릿 사용)      |
| `doc-out`                        | 전체 문서를 현재 대상 파일로 출력                                                                |
| `document-project`               | 기존 프로젝트 문서화 (document-project.md 작업 실행)                                             |
| `execute-checklist {checklist}`  | 체크리스트 실행 (execute-checklist 작업 실행, 기본값: `architect-checklist`)                     |
| `research {topic}`               | 심층 연구 프롬프트 생성 (create-deep-research-prompt 작업 실행)                                  |
| `shard-prd`                      | 제공된 `architecture.md`에 대해 `shard-doc.md` 작업 실행 (파일을 찾지 못하면 문의)               |
| `yolo`                           | Yolo 모드 토글                                                                                   |
| `exit`                           | 설계자로서 작별 인사를 하고 이 페르소나에서 벗어남                                               |

---

## 📝 PO (제품 소유자)

**ID**: `po`
**사용 시기**: 백로그 관리, 스토리 구체화, 수락 기준, 스프린트 계획 및 우선순위 결정에 사용됩니다.

| 명령어                               | 설명                                                                                       |
| :----------------------------------- | :----------------------------------------------------------------------------------------- |
| `help`                               | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시                                   |
| `correct-course`                     | `correct-course` 작업 실행 (중요한 변경 사항 발생 시 경로 재설정)                          |
| `create-epic`                        | 브라운필드 프로젝트용 에픽 생성 (brownfield-create-epic 작업 실행)                         |
| `create-story`                       | 요구 사항으로부터 사용자 스토리 생성 (brownfield-create-story 작업 실행)                   |
| `doc-out`                            | 전체 문서를 현재 대상 파일로 출력                                                          |
| `execute-checklist-po`               | PO 마스터 체크리스트 실행 (execute-checklist 작업 실행, 체크리스트: `po-master-checklist`) |
| `shard-doc {document} {destination}` | 제공된 문서에 대해 `shard-doc` 작업 실행                                                   |
| `validate-story-draft {story}`       | 제공된 스토리 파일에 대해 `validate-next-story` 작업 실행 (스토리 초안 유효성 검사)        |
| `yolo`                               | Yolo 모드 토글 (확인 건너뛰기)                                                             |
| `exit`                               | 종료 (확인)                                                                                |

---

## 🏃 SM (스크럼 마스터)

**ID**: `sm`
**사용 시기**: 스토리 생성, 에픽 관리, 회고, 애자일 프로세스 가이드에 사용됩니다.

| 명령어             | 설명                                                                                     |
| :----------------- | :--------------------------------------------------------------------------------------- |
| `*help`            | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시                                 |
| `*correct-course`  | 코스 수정 작업 실행 (correct-course.md 작업 실행)                                        |
| `*draft`           | 다음 스토리 생성 작업 실행 (create-next-story.md 작업 실행)                              |
| `*story-checklist` | 스토리 초안 체크리스트 실행 (execute-checklist.md 작업 및 story-draft-checklist.md 사용) |
| `*exit`            | 스크럼 마스터로서 작별 인사를 하고 이 페르소나에서 벗어남                                |

---

## 🧪 QA (테스트 아키텍트 & 품질 어드바이저)

**ID**: `qa`
**사용 시기**: 포괄적인 테스트 아키텍처 검토, 품질 게이트 결정, 코드 개선에 사용됩니다.

| 명령어                  | 설명                                                        |
| :---------------------- | :---------------------------------------------------------- |
| `*help`                 | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시    |
| `*gate {story}`         | 품질 게이트 결정 파일 생성/업데이트 (qa-gate 작업 실행)     |
| `*nfr-assess {story}`   | 비기능 요구사항 검증 (nfr-assess 작업 실행)                 |
| `*review {story}`       | 적응형 위험 인식 포괄적 검토 (review-story 작업 실행)       |
| `*risk-profile {story}` | 위험 평가 매트릭스 생성 (risk-profile 작업 실행)            |
| `*test-design {story}`  | 포괄적인 테스트 시나리오 생성 (test-design 작업 실행)       |
| `*trace {story}`        | 요구사항을 테스트에 매핑 (trace-requirements 작업 실행)     |
| `*exit`                 | 테스트 아키텍트로서 작별 인사를 하고 이 페르소나에서 벗어남 |

---

## 💻 Dev (풀스택 개발자)

**ID**: `dev`
**사용 시기**: 코드 구현, 디버깅, 리팩토링, 개발 모범 사례에 사용됩니다.

| 명령어           | 설명                                                       |
| :--------------- | :--------------------------------------------------------- |
| `*help`          | 선택할 수 있도록 다음 명령어의 번호가 매겨진 목록을 표시   |
| `*develop-story` | 스토리 개발 실행 (순차적 태스크 실행)                      |
| `*explain`       | 방금 수행한 작업에 대한 상세 설명 (주니어 엔지니어 교육용) |
| `*review-qa`     | QA 수정사항 적용 작업 실행 (apply-qa-fixes.md 작업 실행)   |
| `*run-tests`     | 린팅 및 테스트 실행                                        |
| `*exit`          | 개발자로서 작별 인사를 하고 이 페르소나에서 벗어남         |

---

## 🧙 BMad Master (비엠에드 마스터 태스크 실행자)

**ID**: `bmad-master`
**사용 시기**: 모든 도메인에 걸친 포괄적 전문성, 페르소나가 필요 없는 일회성 작업, 동일한 에이전트로 여러 작업 수행에 사용됩니다.

| 명령어                                | 설명                                                                         |
| :------------------------------------ | :--------------------------------------------------------------------------- |
| `*help`                               | 명령어 목록을 번호 목록으로 표시                                             |
| `*create-doc {template}`              | 문서 생성 작업 실행 (템플릿 미지정 시 사용 가능한 템플릿 목록 표시)          |
| `*doc-out`                            | 전체 문서를 현재 대상 파일로 출력                                            |
| `*document-project`                   | 프로젝트 문서화 작업 실행 (document-project.md 작업 실행)                    |
| `*execute-checklist {checklist}`      | 체크리스트 실행 작업 (체크리스트 미지정 시 사용 가능한 체크리스트 목록 표시) |
| `*kb`                                 | KB 모드 토글 (기본값: 꺼짐, 켜지면 bmad-kb.md 로드하여 대화)                 |
| `*shard-doc {document} {destination}` | 문서 분할 작업 실행 (shard-doc 작업 실행)                                    |
| `*task {task}`                        | 작업 실행 (작업 미지정 시 사용 가능한 작업 목록 표시)                        |
| `*yolo`                               | Yolo 모드 토글                                                               |
| `*exit`                               | 종료 (확인)                                                                  |

---

## 공통 명령어 규칙

- 모든 명령어는 `*` 접두사가 필요합니다 (예: `*help`, `*create-prd`)
- 각 에이전트는 고유한 페르소나와 전문성을 가지며, 특정 도메인에 특화된 작업을 수행합니다
- 에이전트 간 협업을 통해 전체 프로젝트 라이프사이클을 관리할 수 있습니다
- `*help` 명령어로 각 에이전트의 사용 가능한 명령어를 확인할 수 있습니다

---

이 명령어들을 사용하여 BMad-Method 프레임워크 내에서 효과적으로 작업을 지시하고 에이전트를 조정할 수 있습니다.

혹시 **BMad Orchestrator**를 활성화하여 워크플로를 탐색하거나 특정 에이전트에게 명령을 내리고 싶으신가요? 아니면 **BMad-Method**에 대해 더 궁금한 점이 있으신가요?
