import { Metadata } from 'next'
import ConfiguratorUI from './components/ConfiguratorUI'

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
    <main className="min-h-screen">
      <ConfiguratorUI />
    </main>
  )
}