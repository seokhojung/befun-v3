// Swagger JSON API 엔드포인트
import { NextRequest, NextResponse } from 'next/server'
import { getSwaggerSpecWithVersion } from '@/lib/api/swagger'

/**
 * @swagger
 * /api/docs/swagger.json:
 *   get:
 *     summary: Get OpenAPI 3.0 specification
 *     description: Returns the complete OpenAPI specification for the Befun v3 API
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0 specification
 */
export async function GET(request: NextRequest) {
  try {
    const spec = getSwaggerSpecWithVersion()

    if (!spec) {
      return NextResponse.json(
        {
          error: 'Failed to generate API specification',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(spec, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5분 캐시
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error serving Swagger spec:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to serve API specification',
      },
      { status: 500 }
    )
  }
}

// OPTIONS 핸들러 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}