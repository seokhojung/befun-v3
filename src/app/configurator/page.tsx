import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import ConfiguratorErrorBoundary from '@/components/error-boundary/ConfiguratorErrorBoundary'

// Dynamically import ConfiguratorUI to prevent SSR issues
const ConfiguratorUI = dynamic(() => import('./components/ConfiguratorUI'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">3D 컨피규레이터 로딩 중...</p>
      </div>
    </div>
  ),
})

export const metadata: Metadata = {
  title: '3D 책상 컨피규레이터 - BeFun',
  description: '실시간 3D로 나만의 책상을 디자인하고 커스터마이징하세요',
  openGraph: {
    title: '3D 책상 컨피규레이터 - BeFun',
    description: '실시간 3D로 나만의 책상을 디자인하고 커스터마이징하세요',
    type: 'website',
  },
}

export default function ConfiguratorPage() {
  return (
    <ConfiguratorErrorBoundary>
      <main className="min-h-screen">
        <ConfiguratorUI />
      </main>
    </ConfiguratorErrorBoundary>
  )
}