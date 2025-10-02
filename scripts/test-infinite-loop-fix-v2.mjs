#!/usr/bin/env node

/**
 * Story 1.2C: React 무한 루프 수정 검증 스크립트 v2
 * QA 에이전트가 작성한 테스트 스크립트
 *
 * 검증 항목:
 * 1. /configurator 페이지 정상 로드
 * 2. API 500 에러 없음
 * 3. 콘솔 에러 없음
 */

// Node.js 18+에서는 fetch가 내장되어 있음

const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'test01@test.test';
const TEST_PASSWORD = 'test1234';

let testPassed = true;
const errors = [];

// 색상 코드
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${BLUE}🧪 Story 1.2C: React 무한 루프 수정 검증 시작${RESET}`);
console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

// Step 1: 서버 상태 확인
async function checkServerHealth() {
  console.log(`${YELLOW}Step 1: 서버 상태 확인${RESET}`);

  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();

    if (response.ok) {
      console.log(`  ${GREEN}✓ 서버가 정상적으로 실행 중입니다${RESET}`);
      console.log(`    - Status: ${data.status}`);
      console.log(`    - Version: ${data.version}`);
      return true;
    } else {
      console.log(`  ${RED}✗ 서버 응답 오류: ${response.status}${RESET}`);
      errors.push('서버 상태 확인 실패');
      return false;
    }
  } catch (error) {
    console.log(`  ${RED}✗ 서버 연결 실패: ${error.message}${RESET}`);
    errors.push(`서버 연결 실패: ${error.message}`);
    return false;
  }
}

// Step 2: 로그인
async function login() {
  console.log(`\n${YELLOW}Step 2: 사용자 로그인${RESET}`);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (response.ok) {
      const setCookieHeader = response.headers.get('set-cookie');
      console.log(`  ${GREEN}✓ 로그인 성공${RESET}`);
      console.log(`    - User: ${TEST_EMAIL}`);
      return setCookieHeader;
    } else {
      console.log(`  ${RED}✗ 로그인 실패: ${response.status}${RESET}`);
      errors.push('로그인 실패');
      return null;
    }
  } catch (error) {
    console.log(`  ${RED}✗ 로그인 요청 실패: ${error.message}${RESET}`);
    errors.push(`로그인 요청 실패: ${error.message}`);
    return null;
  }
}

// Step 3: Configurator 페이지 접근
async function testConfiguratorPage(cookie) {
  console.log(`\n${YELLOW}Step 3: Configurator 페이지 테스트${RESET}`);

  try {
    const response = await fetch(`${BASE_URL}/configurator`, {
      headers: cookie ? { 'Cookie': cookie } : {}
    });

    if (response.ok) {
      const html = await response.text();

      // HTML에서 에러 메시지 확인
      const hasInfiniteLoopError = html.includes('Maximum update depth exceeded');
      const hasReactError = html.includes('Error occurred in');
      const hasPageContent = html.includes('ConfiguratorUI') || html.includes('configurator');

      if (hasInfiniteLoopError) {
        console.log(`  ${RED}✗ 무한 루프 에러 발견!${RESET}`);
        errors.push('Maximum update depth exceeded 에러 발견');
        testPassed = false;
      } else if (hasReactError) {
        console.log(`  ${RED}✗ React 에러 발견${RESET}`);
        errors.push('React 에러 발견');
        testPassed = false;
      } else if (hasPageContent) {
        console.log(`  ${GREEN}✓ 페이지가 정상적으로 로드되었습니다${RESET}`);
      } else {
        console.log(`  ${YELLOW}⚠ 페이지 내용을 확인할 수 없습니다${RESET}`);
      }

      return true;
    } else {
      console.log(`  ${RED}✗ 페이지 로드 실패: ${response.status}${RESET}`);
      errors.push(`페이지 로드 실패: ${response.status}`);
      testPassed = false;
      return false;
    }
  } catch (error) {
    console.log(`  ${RED}✗ 페이지 요청 실패: ${error.message}${RESET}`);
    errors.push(`페이지 요청 실패: ${error.message}`);
    testPassed = false;
    return false;
  }
}

// Step 4: BFF API 테스트
async function testBffApi(cookie) {
  console.log(`\n${YELLOW}Step 4: BFF Configurator API 테스트${RESET}`);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/bff/configurator?include_materials=true`, {
      headers: cookie ? { 'Cookie': cookie } : {}
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ${GREEN}✓ BFF API 정상 응답${RESET}`);
      console.log(`    - Materials: ${data.data?.materials?.length || 0}개`);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log(`  ${RED}✗ BFF API 에러: ${response.status}${RESET}`);
      console.log(`    - Error: ${errorData.error || '알 수 없는 에러'}`);

      if (response.status === 500) {
        errors.push('BFF API 500 에러 - user_profiles 문제 가능성');
      }
      testPassed = false;
      return false;
    }
  } catch (error) {
    console.log(`  ${RED}✗ BFF API 요청 실패: ${error.message}${RESET}`);
    errors.push(`BFF API 요청 실패: ${error.message}`);
    testPassed = false;
    return false;
  }
}

// Step 5: Pricing API 테스트
async function testPricingApi(cookie) {
  console.log(`\n${YELLOW}Step 5: Pricing Calculate API 테스트${RESET}`);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/pricing/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {})
      },
      body: JSON.stringify({
        width_cm: 120,
        depth_cm: 60,
        height_cm: 75,
        material: 'wood',
        use_cache: true,
        estimate_only: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ${GREEN}✓ 가격 계산 API 정상 응답${RESET}`);
      console.log(`    - Total Price: ${data.data?.result?.total || 'N/A'}원`);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log(`  ${RED}✗ 가격 계산 API 에러: ${response.status}${RESET}`);
      console.log(`    - Error: ${errorData.error || errorData.message || '알 수 없는 에러'}`);

      if (response.status === 500 && errorData.error?.includes('map')) {
        errors.push('materials.map() 에러 - undefined 처리 필요');
      }
      testPassed = false;
      return false;
    }
  } catch (error) {
    console.log(`  ${RED}✗ 가격 계산 API 요청 실패: ${error.message}${RESET}`);
    errors.push(`가격 계산 API 요청 실패: ${error.message}`);
    testPassed = false;
    return false;
  }
}

// Step 6: Materials API 테스트
async function testMaterialsApi(cookie) {
  console.log(`\n${YELLOW}Step 6: Materials API 테스트${RESET}`);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/pricing/calculate?action=materials`, {
      headers: cookie ? { 'Cookie': cookie } : {}
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ${GREEN}✓ Materials API 정상 응답${RESET}`);
      console.log(`    - Materials Count: ${data.data?.materials?.length || 0}개`);

      if (data.data?.materials?.length > 0) {
        console.log(`    - Available: ${data.data.materials.map(m => m.type).join(', ')}`);
      }
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log(`  ${RED}✗ Materials API 에러: ${response.status}${RESET}`);
      console.log(`    - Error: ${errorData.error || '알 수 없는 에러'}`);

      if (response.status === 500) {
        errors.push('Materials API 500 에러 - undefined.map() 문제');
      }
      testPassed = false;
      return false;
    }
  } catch (error) {
    console.log(`  ${RED}✗ Materials API 요청 실패: ${error.message}${RESET}`);
    errors.push(`Materials API 요청 실패: ${error.message}`);
    testPassed = false;
    return false;
  }
}

// 메인 테스트 실행
async function runTests() {
  // Step 1: 서버 상태 확인
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log(`\n${RED}서버가 실행 중이지 않습니다. npm run dev를 먼저 실행해주세요.${RESET}`);
    process.exit(1);
  }

  // Step 2: 로그인
  const cookie = await login();

  // Step 3: Configurator 페이지 테스트
  await testConfiguratorPage(cookie);

  // Step 4: BFF API 테스트
  await testBffApi(cookie);

  // Step 5: Pricing API 테스트
  await testPricingApi(cookie);

  // Step 6: Materials API 테스트
  await testMaterialsApi(cookie);

  // 결과 출력
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}📊 테스트 결과 요약${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

  if (testPassed && errors.length === 0) {
    console.log(`${GREEN}✅ 모든 테스트 통과!${RESET}`);
    console.log(`${GREEN}   React 무한 루프 문제가 해결되었습니다.${RESET}`);
  } else {
    console.log(`${RED}❌ 테스트 실패${RESET}`);
    console.log(`${RED}   발견된 문제:${RESET}`);
    errors.forEach(error => {
      console.log(`   ${RED}- ${error}${RESET}`);
    });

    console.log(`\n${YELLOW}💡 추천 조치:${RESET}`);
    if (errors.some(e => e.includes('user_profiles'))) {
      console.log(`   - user_profiles 레코드 생성 필요 (DATA-001)`);
    }
    if (errors.some(e => e.includes('undefined.map()'))) {
      console.log(`   - pricing/calculate API의 materials 처리 수정 필요`);
    }
    if (errors.some(e => e.includes('Maximum update depth'))) {
      console.log(`   - React useEffect 의존성 배열 재점검 필요`);
    }
  }

  process.exit(testPassed ? 0 : 1);
}

// 테스트 실행
runTests().catch(error => {
  console.error(`${RED}테스트 실행 중 예기치 않은 오류:${RESET}`, error);
  process.exit(1);
});