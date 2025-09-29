'use client'

// Swagger UI 페이지
import { useEffect, useRef } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  const swaggerConfig = {
    url: '/api/docs/swagger.json',
    dom_id: '#swagger-ui',
    presets: ['standalone'],
    layout: 'StandaloneLayout',
    deepLinking: true,
    displayOperationId: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    defaultModelRendering: 'example',
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    maxDisplayedTags: 10,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete'],
    validatorUrl: null, // 외부 검증기 비활성화
    plugins: [],
    requestInterceptor: (request: any) => {
      // CSRF 토큰 추가
      const csrfToken = sessionStorage.getItem('csrf-token')
      if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method?.toUpperCase())) {
        request.headers['X-CSRF-Token'] = csrfToken
      }

      // JWT 토큰 추가 (localStorage에서)
      const authToken = localStorage.getItem('auth-token')
      if (authToken) {
        request.headers['Authorization'] = `Bearer ${authToken}`
      }

      return request
    },
    responseInterceptor: (response: any) => {
      // 응답 로깅
      console.log('API Response:', {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
      })

      return response
    },
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Befun v3 API Documentation
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Complete API reference for the 3D Configurator Platform
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800">
                v1.0.0
              </span>
              <a
                href="https://github.com/befun/v3-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                GitHub Repository
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 네비게이션 */}
      <nav className="border-b border-gray-200 bg-gray-50 px-6 py-2">
        <div className="mx-auto max-w-7xl">
          <div className="flex space-x-8">
            <a
              href="#overview"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Overview
            </a>
            <a
              href="#authentication"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Authentication
            </a>
            <a
              href="#rate-limiting"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Rate Limiting
            </a>
            <a
              href="#errors"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Error Handling
            </a>
            <a
              href="/api/v1/status"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              API Status
            </a>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 개요 섹션 */}
        <section id="overview" className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            API Overview
          </h2>
          <div className="rounded-lg bg-blue-50 p-6">
            <h3 className="mb-3 font-medium text-blue-900">
              Base URL
            </h3>
            <code className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-800">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1
            </code>

            <h3 className="mb-3 mt-6 font-medium text-blue-900">
              Content Type
            </h3>
            <p className="text-sm text-blue-800">
              All requests and responses use <code className="rounded bg-blue-100 px-1">application/json</code>
            </p>

            <h3 className="mb-3 mt-6 font-medium text-blue-900">
              Response Format
            </h3>
            <p className="text-sm text-blue-800">
              All responses follow a consistent format with <code className="rounded bg-blue-100 px-1">success</code>,
              <code className="rounded bg-blue-100 px-1 ml-1">data</code>, and
              <code className="rounded bg-blue-100 px-1 ml-1">error</code> fields.
            </p>
          </div>
        </section>

        {/* 인증 섹션 */}
        <section id="authentication" className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Authentication
          </h2>
          <div className="rounded-lg bg-amber-50 p-6">
            <p className="text-sm text-amber-800 mb-4">
              The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header.
            </p>
            <pre className="rounded bg-amber-100 p-3 text-sm text-amber-900 overflow-x-auto">
{`Authorization: Bearer <your-jwt-token>`}
            </pre>
          </div>
        </section>

        {/* Rate Limiting 섹션 */}
        <section id="rate-limiting" className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Rate Limiting
          </h2>
          <div className="rounded-lg bg-purple-50 p-6">
            <p className="text-sm text-purple-800 mb-4">
              API requests are rate limited. Check the response headers for current limits:
            </p>
            <ul className="text-sm text-purple-800 space-y-1">
              <li><code className="rounded bg-purple-100 px-1">X-RateLimit-Limit</code>: Total requests allowed</li>
              <li><code className="rounded bg-purple-100 px-1">X-RateLimit-Remaining</code>: Requests remaining</li>
              <li><code className="rounded bg-purple-100 px-1">X-RateLimit-Reset</code>: Reset timestamp</li>
            </ul>
          </div>
        </section>

        {/* 에러 처리 섹션 */}
        <section id="errors" className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Error Handling
          </h2>
          <div className="rounded-lg bg-red-50 p-6">
            <p className="text-sm text-red-800 mb-4">
              Errors are returned in a consistent format with appropriate HTTP status codes:
            </p>
            <pre className="rounded bg-red-100 p-3 text-sm text-red-900 overflow-x-auto">
{`{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided data is invalid",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "req_123456"
}`}
            </pre>
          </div>
        </section>

        {/* Swagger UI */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            API Reference
          </h2>
          <div ref={containerRef} className="swagger-container">
            <SwaggerUI {...swaggerConfig} />
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-8 mt-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              © 2024 Befun v3 API. Built with Next.js and OpenAPI 3.0.
            </div>
            <div className="flex space-x-4">
              <a
                href="mailto:api-support@befun.example.com"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Support
              </a>
              <a
                href="/terms"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Terms
              </a>
              <a
                href="/privacy"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 스타일 커스터마이징 */}
      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin-bottom: 30px;
        }

        .swagger-ui .scheme-container {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .swagger-ui .opblock {
          border: 1px solid #e9ecef;
          border-radius: 6px;
          margin-bottom: 15px;
        }

        .swagger-ui .opblock-summary {
          padding: 15px 20px;
        }

        .swagger-ui .opblock .opblock-section-header {
          background: #f8f9fa;
          padding: 12px 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .swagger-ui .parameters-col_description p,
        .swagger-ui .response-col_description p {
          margin: 0;
          color: #6c757d;
          font-size: 13px;
        }

        .swagger-ui .model {
          font-size: 13px;
        }

        .swagger-ui .model-title {
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}