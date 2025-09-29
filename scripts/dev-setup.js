#!/usr/bin/env node
// 개발 환경 설정 스크립트

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Befun v3 개발 환경 설정을 시작합니다...\n')

// 환경 변수 파일 확인
function checkEnvFiles() {
  console.log('📋 환경 변수 파일을 확인하는 중...')

  const envExample = path.join(process.cwd(), '.env.example')
  const envLocal = path.join(process.cwd(), '.env.local')

  if (!fs.existsSync(envExample)) {
    console.error('❌ .env.example 파일을 찾을 수 없습니다.')
    process.exit(1)
  }

  if (!fs.existsSync(envLocal)) {
    console.log('📝 .env.local 파일을 생성하는 중...')
    fs.copyFileSync(envExample, envLocal)
    console.log('✅ .env.local 파일이 생성되었습니다. 필요한 값들을 설정해주세요.')
  } else {
    console.log('✅ .env.local 파일이 존재합니다.')
  }
}

// 의존성 확인 및 설치
function checkDependencies() {
  console.log('\n📦 의존성을 확인하는 중...')

  try {
    execSync('npm list --depth=0', { stdio: 'ignore' })
    console.log('✅ 모든 의존성이 설치되어 있습니다.')
  } catch (error) {
    console.log('📥 누락된 의존성을 설치하는 중...')
    execSync('npm install', { stdio: 'inherit' })
    console.log('✅ 의존성 설치가 완료되었습니다.')
  }
}

// 개발용 데이터베이스 설정 확인
function checkDatabase() {
  console.log('\n🗄️ 데이터베이스 연결을 확인하는 중...')

  const envLocal = path.join(process.cwd(), '.env.local')

  if (fs.existsSync(envLocal)) {
    const envContent = fs.readFileSync(envLocal, 'utf8')
    const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=https://')
    const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !envContent.includes('your-anon-key')

    if (hasSupabaseUrl && hasSupabaseKey) {
      console.log('✅ Supabase 설정이 구성되어 있습니다.')
    } else {
      console.log('⚠️  Supabase 설정을 완료해주세요 (.env.local 파일)')
    }
  }
}

// Git Hooks 설정
function setupGitHooks() {
  console.log('\n🔗 Git Hooks를 설정하는 중...')

  const gitDir = path.join(process.cwd(), '.git')
  if (!fs.existsSync(gitDir)) {
    console.log('📝 Git 저장소를 초기화하는 중...')
    execSync('git init', { stdio: 'inherit' })
  }

  const hooksDir = path.join(gitDir, 'hooks')
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true })
  }

  // Pre-commit hook
  const preCommitHook = `#!/bin/sh
# Pre-commit hook for code quality checks

echo "🔍 Pre-commit 검사를 실행하는 중..."

# Lint 검사
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint 검사 실패. 코드를 수정해주세요."
  exit 1
fi

# 타입 검사
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ 타입 검사 실패. 타입 오류를 수정해주세요."
  exit 1
fi

# 테스트 실행 (빠른 테스트만)
npm run test -- --passWithNoTests --silent
if [ $? -ne 0 ]; then
  echo "❌ 테스트 실패. 테스트를 수정해주세요."
  exit 1
fi

echo "✅ Pre-commit 검사가 완료되었습니다."
`

  const preCommitPath = path.join(hooksDir, 'pre-commit')
  fs.writeFileSync(preCommitPath, preCommitHook)

  // Make executable (Unix/Linux/Mac)
  if (process.platform !== 'win32') {
    execSync(`chmod +x ${preCommitPath}`)
  }

  console.log('✅ Git Hooks가 설정되었습니다.')
}

// 개발 서버 상태 확인
function checkDevServer() {
  console.log('\n🌐 개발 서버 상태를 확인하는 중...')

  try {
    const response = require('http').get('http://localhost:3000/api/v1/status', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ 개발 서버가 실행 중입니다.')
      } else {
        console.log('⚠️  개발 서버가 정상 응답하지 않습니다.')
      }
    })

    response.on('error', () => {
      console.log('📴 개발 서버가 실행되고 있지 않습니다.')
      console.log('💡 서버를 시작하려면: npm run dev')
    })

    response.setTimeout(2000, () => {
      response.destroy()
      console.log('📴 개발 서버가 실행되고 있지 않습니다.')
    })

  } catch (error) {
    console.log('📴 개발 서버가 실행되고 있지 않습니다.')
  }
}

// 개발 도구 설정 확인
function checkDevTools() {
  console.log('\n🛠️ 개발 도구를 확인하는 중...')

  const tools = [
    { name: 'ESLint', command: 'npx eslint --version' },
    { name: 'Prettier', command: 'npx prettier --version' },
    { name: 'TypeScript', command: 'npx tsc --version' },
    { name: 'Jest', command: 'npx jest --version' }
  ]

  tools.forEach(tool => {
    try {
      execSync(tool.command, { stdio: 'ignore' })
      console.log(`✅ ${tool.name}이 설치되어 있습니다.`)
    } catch (error) {
      console.log(`❌ ${tool.name}이 설치되어 있지 않습니다.`)
    }
  })
}

// 사용법 안내
function showUsage() {
  console.log('\n📚 개발 명령어 안내:')
  console.log('  npm run dev         - 개발 서버 시작')
  console.log('  npm run build       - 프로덕션 빌드')
  console.log('  npm run start       - 프로덕션 서버 시작')
  console.log('  npm run lint        - 코드 검사')
  console.log('  npm run lint:fix    - 코드 자동 수정')
  console.log('  npm run type-check  - 타입 검사')
  console.log('  npm run test        - 테스트 실행')
  console.log('  npm run test:watch  - 테스트 감시 모드')
  console.log('  npm run test:coverage - 커버리지 포함 테스트')
  console.log('  npm run storybook   - Storybook 시작')
  console.log('\n📖 API 문서: http://localhost:3000/api-docs')
  console.log('📊 Storybook: http://localhost:6006')
}

// 메인 실행 함수
async function main() {
  try {
    checkEnvFiles()
    checkDependencies()
    checkDatabase()
    setupGitHooks()
    checkDevTools()

    // 짧은 지연 후 서버 상태 확인
    setTimeout(checkDevServer, 1000)

    console.log('\n🎉 개발 환경 설정이 완료되었습니다!')
    showUsage()

  } catch (error) {
    console.error('\n❌ 설정 중 오류가 발생했습니다:', error.message)
    process.exit(1)
  }
}

// CLI 모드에서 실행된 경우
if (require.main === module) {
  main()
}

module.exports = {
  checkEnvFiles,
  checkDependencies,
  checkDatabase,
  setupGitHooks,
  checkDevServer,
  checkDevTools
}