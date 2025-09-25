# BeFun v3 배포 가이드

## Vercel 배포 설정

### 1. Vercel 프로젝트 연결
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
vercel

# 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXTAUTH_SECRET
```

### 2. 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수들을 설정하세요:

#### Production 환경 변수
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 역할 키
- `NEXTAUTH_SECRET`: 인증 시크릿 키 (랜덤 문자열)
- `NEXTAUTH_URL`: 프로덕션 도메인 URL

### 3. 빌드 설정
- **Framework Preset**: Next.js
- **Node.js Version**: 20.x
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 4. 도메인 설정
1. Vercel 대시보드에서 Domains 탭으로 이동
2. 커스텀 도메인 추가
3. DNS 설정 업데이트

## 성능 최적화

### 빌드 캐싱
- Next.js 자동 빌드 캐시 활용
- `/.next/cache` 디렉토리 캐싱

### 이미지 최적화
- Next.js Image 컴포넌트 사용 권장
- WebP, AVIF 형식 자동 변환

### 서버리스 함수 최적화
- API 라우트는 자동으로 Edge Functions로 배포
- 콜드 스타트 최적화를 위한 코드 분할

## 모니터링

### Vercel Analytics
```bash
npm install @vercel/analytics
```

### 성능 모니터링
- Core Web Vitals 추적
- 실시간 성능 지표 확인

## 보안 설정

### 환경 변수 보안
- 민감한 키는 환경 변수로만 관리
- GitHub 등 소스 코드에 절대 노출 금지

### CORS 설정
- API 라우트 CORS 헤더 설정
- 프로덕션 도메인만 허용

## 배포 체크리스트
- [ ] 모든 환경 변수 설정 완료
- [ ] 빌드 테스트 통과 (`npm run build`)
- [ ] 타입 체크 통과 (`npm run type-check`)
- [ ] 린트 검사 통과 (`npm run lint`)
- [ ] 테스트 통과 (`npm run test`)
- [ ] Vercel 프로젝트 연결
- [ ] 도메인 설정 (필요시)
- [ ] Supabase 프로덕션 환경 연결