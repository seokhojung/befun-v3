// Jest 설정 파일
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Next.js 앱이 있는 디렉토리 경로 제공
  dir: './',
})

// Jest에 전달할 커스텀 설정
const customJestConfig = {
  // 테스트 환경 설정 - React 컴포넌트 테스트를 위해 jsdom 사용
  testEnvironment: 'jsdom',

  // 설정 파일들
  setupFiles: ['./jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  // 모듈 경로 매핑 (Next.js 경로 별칭과 동일)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // 제외할 파일/디렉토리
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/setup.ts',
    '<rootDir>/__tests__/helpers/',
  ],

  // 커버리지 설정
  collectCoverage: false, // 기본적으로 비활성화, npm run test:coverage로 활성화
  collectCoverageFrom: [
    'src/**/*.(ts|tsx|js|jsx)',
    '!src/**/*.d.ts',
    '!src/**/*.stories.*',
    '!src/**/index.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/globals.css',
  ],

  // 커버리지 임계값
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
    // API 라우트는 더 높은 커버리지 요구
    'src/app/api/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    // 유틸리티 함수는 높은 커버리지 요구
    'src/lib/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 95,
      statements: 95,
    },
  },

  // 커버리지 리포트 형식
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
  ],

  // 커버리지 출력 디렉토리
  coverageDirectory: 'coverage',

  // 모의(Mock) 설정
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // 테스트 타임아웃 (밀리초)
  testTimeout: 10000,

  // 변환 무시 패턴
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],

  // 모듈 파일 확장자
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
  ],

  // 전역 설정
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },

  // verbose 출력
  verbose: true,

  // 병렬 실행 설정
  maxWorkers: '50%',

  // 캐시 디렉토리
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // 에러 출력 설정
  errorOnDeprecated: true,

  // 테스트 결과 프로세서
  testResultsProcessor: undefined,

  // Watch 모드 설정
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],

  // 스냅샷 설정
  snapshotSerializers: [],

  // 테스트 환경별 설정
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
}

// createJestConfig는 비동기적으로 Next.js 설정을 로드하므로
// Jest 설정을 내보내기 전에 이 작업을 수행해야 함
module.exports = createJestConfig(customJestConfig)
