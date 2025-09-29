/** @type {import('next').NextConfig} */
const nextConfig = {
  // React 설정
  reactStrictMode: true,

  // Webpack 설정
  webpack: (config) => {
    // Storybook 파일 제외
    config.module.rules.push({
      test: /\.stories\.(js|jsx|ts|tsx)$/,
      use: 'ignore-loader',
    })
    return config
  },

  // Vercel 최적화 설정
  poweredByHeader: false,
  compress: true,

  // 이미지 최적화 설정
  images: {
    formats: ['image/webp', 'image/avif'],
    domains: [], // 외부 이미지 도메인 허용 목록
  },

  // 개발 환경 설정
  experimental: {
    turbo: {
      // Turbopack 설정 (개발 시 빌드 속도 향상)
    }
  },

  // 환경 변수 설정
  env: {
    CUSTOM_KEY: 'BeFun v3',
  },

  // 개발 모드 최적화
  devIndicators: {
    buildActivity: false, // 빌드 인디케이터 숨김
  },

  // 콘솔 로그 레벨 조정 (프로덕션)
  ...(process.env.NODE_ENV === 'production' && {
    logging: {
      fetches: {
        fullUrl: false,
      },
    },
  }),
}

module.exports = nextConfig