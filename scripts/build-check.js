#!/usr/bin/env node
// 빌드 전 체크 스크립트

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔍 빌드 전 검사를 시작합니다...\n')

let hasErrors = false

// TypeScript 타입 체크
function checkTypes() {
  console.log('📝 TypeScript 타입 체크...')
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' })
    console.log('✅ TypeScript 타입 체크 통과\n')
  } catch (error) {
    console.error('❌ TypeScript 타입 오류:')
    console.error(error.stdout.toString())
    hasErrors = true
  }
}

// ESLint 체크
function checkLint() {
  console.log('🔍 ESLint 체크...')
  try {
    execSync('npm run lint', { stdio: 'pipe' })
    console.log('✅ ESLint 체크 통과\n')
  } catch (error) {
    console.error('❌ ESLint 오류:')
    console.error(error.stdout.toString())
    hasErrors = true
  }
}

// 테스트 실행
function runTests() {
  console.log('🧪 테스트 실행...')
  try {
    execSync('npm run test -- --passWithNoTests --silent --maxWorkers=2', { stdio: 'pipe' })
    console.log('✅ 모든 테스트 통과\n')
  } catch (error) {
    console.error('❌ 테스트 실패:')
    console.error(error.stdout.toString())
    hasErrors = true
  }
}

// 환경 변수 체크
function checkEnvVars() {
  console.log('🔧 필수 환경 변수 체크...')
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])

  if (missing.length > 0) {
    console.error('❌ 누락된 환경 변수:', missing.join(', '))
    console.error('💡 .env.local 파일을 확인해주세요')
    hasErrors = true
  } else {
    console.log('✅ 필수 환경 변수 확인 완료\n')
  }
}

// 의존성 보안 체크
function checkSecurity() {
  console.log('🛡️ 의존성 보안 체크...')
  try {
    const auditResult = execSync('npm audit --audit-level=moderate', {
      stdio: 'pipe',
      encoding: 'utf8'
    })

    if (auditResult.includes('found 0 vulnerabilities')) {
      console.log('✅ 보안 취약점 없음\n')
    } else {
      console.log('⚠️ 보안 취약점 발견:')
      console.log(auditResult)
      console.log('💡 npm audit fix를 실행하여 수정하세요\n')
    }
  } catch (error) {
    const output = error.stdout.toString()
    if (output.includes('vulnerabilities')) {
      console.log('⚠️ 보안 취약점 발견:')
      console.log(output)
      console.log('💡 npm audit fix를 실행하여 수정하세요\n')
    }
  }
}

// 번들 크기 체크 (간단 버전)
function checkBundleSize() {
  console.log('📦 번들 크기 추정...')

  const srcFiles = getAllFiles('src', ['.ts', '.tsx', '.js', '.jsx'])
  const totalSize = srcFiles.reduce((total, file) => {
    return total + fs.statSync(file).size
  }, 0)

  const sizeInMB = (totalSize / 1024 / 1024).toFixed(2)
  console.log(`📊 소스 코드 총 크기: ${sizeInMB}MB`)

  if (totalSize > 5 * 1024 * 1024) { // 5MB 이상
    console.log('⚠️ 소스 코드가 큽니다. 번들 최적화를 고려해보세요')
  }
  console.log()
}

// 헬퍼 함수: 디렉토리에서 특정 확장자 파일들 찾기
function getAllFiles(dir, extensions, files = []) {
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory() && !entry.startsWith('.')) {
      getAllFiles(fullPath, extensions, files)
    } else if (stat.isFile()) {
      const ext = path.extname(entry)
      if (extensions.includes(ext)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

// 메인 실행 함수
async function main() {
  try {
    checkEnvVars()
    checkTypes()
    checkLint()
    runTests()
    checkSecurity()
    checkBundleSize()

    if (hasErrors) {
      console.error('❌ 빌드 전 검사에서 오류가 발견되었습니다.')
      console.error('💡 위의 오류들을 수정한 후 다시 시도해주세요.')
      process.exit(1)
    } else {
      console.log('🎉 모든 검사가 완료되었습니다. 빌드를 진행할 수 있습니다!')
    }

  } catch (error) {
    console.error('❌ 검사 중 예상치 못한 오류가 발생했습니다:', error.message)
    process.exit(1)
  }
}

// CLI에서 직접 실행된 경우
if (require.main === module) {
  main()
}

module.exports = {
  checkTypes,
  checkLint,
  runTests,
  checkEnvVars,
  checkSecurity,
  checkBundleSize
}