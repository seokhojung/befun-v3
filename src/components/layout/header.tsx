"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Container } from "./container"
import { Button } from "@/components/ui/button"
import { Menu, X, User } from "lucide-react"

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  user?: {
    id: string
    email: string
    name?: string
  } | null
  onSignOut?: () => void
  brand?: {
    name: string
    href?: string
    logo?: React.ReactNode
  }
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, user, onSignOut, brand, ...props }, ref) => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

    const navigation = [
      { name: '홈', href: '/' },
      { name: '3D 컨피규레이터', href: '/configurator' },
      { name: '가격 정보', href: '/pricing' },
    ]

    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        <Container>
          <div className="flex h-16 items-center justify-between">
            {/* Brand/Logo */}
            <div className="flex items-center">
              <Link
                href={brand?.href || "/"}
                className="flex items-center space-x-2 font-bold text-xl"
              >
                {brand?.logo}
                <span>{brand?.name || "BeFun"}</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-foreground/60 transition-colors hover:text-foreground"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {user.name || user.email.split('@')[0]}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSignOut}
                  >
                    로그아웃
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/auth/signin">
                    <Button variant="ghost" size="sm">
                      로그인
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm">
                      회원가입
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="메뉴 열기"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 border-t">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-base font-medium text-foreground/60 hover:text-foreground hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </header>
    )
  }
)
Header.displayName = "Header"

export { Header }