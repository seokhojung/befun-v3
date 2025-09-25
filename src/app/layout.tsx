import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { NavigationBar } from '@/components/auth/AuthNavigation'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata = {
  title: 'BeFun v3 - 3D 책상 컨피규레이터',
  description: '3D 책상 컨피규레이터 플랫폼 - 사용자 인증 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <NavigationBar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}