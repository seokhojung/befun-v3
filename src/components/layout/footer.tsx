import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Container } from "./container"

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  brand?: {
    name: string
    description?: string
  }
  links?: {
    title: string
    items: Array<{
      name: string
      href: string
      external?: boolean
    }>
  }[]
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, brand, links, ...props }, ref) => {
    const defaultLinks = [
      {
        title: "서비스",
        items: [
          { name: "3D 컨피규레이터", href: "/configurator" },
          { name: "가격 정보", href: "/pricing" },
          { name: "고객 지원", href: "/support" },
        ],
      },
      {
        title: "회사",
        items: [
          { name: "회사 소개", href: "/about" },
          { name: "블로그", href: "/blog" },
          { name: "채용", href: "/careers" },
        ],
      },
      {
        title: "법적 고지",
        items: [
          { name: "이용약관", href: "/terms" },
          { name: "개인정보처리방침", href: "/privacy" },
          { name: "쿠키 정책", href: "/cookies" },
        ],
      },
    ]

    const footerLinks = links || defaultLinks

    return (
      <footer
        ref={ref}
        className={cn(
          "border-t bg-background",
          className
        )}
        {...props}
      >
        <Container>
          <div className="py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">
                    {brand?.name || "BeFun"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {brand?.description ||
                      "3D 컨피규레이터와 e-커머스 플랫폼으로 맞춤형 제품을 경험해보세요."}
                  </p>
                </div>
              </div>

              {/* Links Sections */}
              {footerLinks.map((section, index) => (
                <div key={index} className="space-y-4">
                  <h4 className="text-sm font-semibold">
                    {section.title}
                  </h4>
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        {'external' in item && item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {item.name}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom Section */}
            <div className="border-t pt-8 mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <p className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} {brand?.name || "BeFun"}. All rights reserved.
                </p>
                <div className="flex items-center space-x-4">
                  <p className="text-xs text-muted-foreground">
                    Made with ❤️ in Seoul
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </footer>
    )
  }
)
Footer.displayName = "Footer"

export { Footer }