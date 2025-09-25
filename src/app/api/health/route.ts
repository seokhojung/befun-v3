import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'BeFun v3 API is running'
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed'
      },
      { status: 500 }
    )
  }
}