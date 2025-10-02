/**
 * Manual Test Script for BLOCKER-002 Infinite Loop Fix
 * Story 1.2C: React Infinite Loop Debugging
 *
 * Tests /configurator page for infinite loop errors
 */

import http from 'http';

const TEST_URL = 'http://localhost:3001/configurator';
const TIMEOUT = 10000; // 10 seconds

console.log('🧪 Testing BLOCKER-002 Fix: React Infinite Loop');
console.log('================================================\n');

console.log(`📡 Requesting: ${TEST_URL}`);
console.log(`⏱️  Timeout: ${TIMEOUT}ms\n`);

const options = {
  method: 'GET',
  timeout: TIMEOUT,
};

const startTime = Date.now();

const req = http.get(TEST_URL, (res) => {
  const duration = Date.now() - startTime;

  console.log(`✅ Response received in ${duration}ms`);
  console.log(`   Status Code: ${res.statusCode}`);
  console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}\n`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📦 Response size: ${data.length} bytes`);

    if (res.statusCode === 200) {
      // Check for React/Next.js error markers
      const hasReactError = data.includes('Maximum update depth exceeded');
      const hasNextError = data.includes('Application error');
      const hasCanvas = data.includes('<canvas');
      const hasConfiguratorUI = data.includes('책상 컨피규레이터') || data.includes('configurator');

      console.log('\n🔍 Content Analysis:');
      console.log(`   Contains <canvas>: ${hasCanvas ? '✅' : '❌'}`);
      console.log(`   Contains ConfiguratorUI: ${hasConfiguratorUI ? '✅' : '❌'}`);
      console.log(`   Has React Error: ${hasReactError ? '❌ FAILED' : '✅ PASSED'}`);
      console.log(`   Has Next.js Error: ${hasNextError ? '❌ FAILED' : '✅ PASSED'}`);

      if (!hasReactError && !hasNextError) {
        console.log('\n✅ SUCCESS: No infinite loop errors detected in HTML');
        console.log('   The page loaded successfully without React errors.\n');
        console.log('📋 Manual Verification Steps:');
        console.log('   1. Open http://localhost:3001/configurator in browser');
        console.log('   2. Open browser DevTools (F12) → Console tab');
        console.log('   3. Verify no "Maximum update depth exceeded" errors');
        console.log('   4. Verify page renders 3D canvas and controls');
        console.log('   5. Interact with material/dimension controls');
        console.log('   6. Confirm no console errors appear\n');
        process.exit(0);
      } else {
        console.log('\n❌ FAILURE: Infinite loop error detected!');
        console.log('   The fix may not be working correctly.\n');
        process.exit(1);
      }
    } else {
      console.log(`\n❌ FAILURE: HTTP ${res.statusCode}`);
      console.log('   Server returned non-200 status code.\n');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  const duration = Date.now() - startTime;
  console.log(`\n❌ Request failed after ${duration}ms`);
  console.log(`   Error: ${error.message}`);
  console.log('\n💡 Possible causes:');
  console.log('   - Dev server not running (run: npm run dev)');
  console.log('   - Server crashed due to infinite loop');
  console.log('   - Network/firewall issue\n');
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.log(`\n⏱️  TIMEOUT after ${TIMEOUT}ms`);
  console.log('   The request took too long - possible infinite loop or server hang.\n');
  process.exit(1);
});
