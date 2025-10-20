# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - button "BeFun" [ref=e6] [cursor=pointer]
        - generic [ref=e7]:
          - button "홈" [ref=e8] [cursor=pointer]
          - button "3D 컨피규레이터" [ref=e9] [cursor=pointer]
      - generic [ref=e10]:
        - button "로그인" [ref=e11] [cursor=pointer]
        - button "회원가입" [ref=e12] [cursor=pointer]
  - main [ref=e13]:
    - generic [ref=e15]:
      - generic [ref=e16]:
        - heading "BeFun에 오신 것을 환영합니다" [level=1] [ref=e17]
        - paragraph [ref=e18]: 3D 책상 디자인을 시작하려면 로그인하세요
      - generic [ref=e20]:
        - heading "로그인" [level=2] [ref=e22]
        - generic [ref=e23]:
          - generic [ref=e24]: 이메일
          - textbox "이메일" [ref=e25]:
            - /placeholder: 이메일을 입력하세요
        - generic [ref=e26]:
          - generic [ref=e27]: 비밀번호
          - textbox "비밀번호" [ref=e28]:
            - /placeholder: 비밀번호를 입력하세요
        - button "로그인" [ref=e30] [cursor=pointer]
        - paragraph [ref=e32]:
          - text: 계정이 없으신가요?
          - button "회원가입하기" [ref=e33] [cursor=pointer]
  - alert [ref=e34]
```