# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BeFun v3 is a **production-ready 3D Desk Configurator Platform** that enables users to customize desks with real-time 3D visualization, instant pricing calculations, and seamless purchase integration. Built with Next.js 14 and Three.js r169, deployed on Vercel's serverless infrastructure with Supabase backend.

## Tech Stack & Architecture

### Core Technologies
- **Frontend**: Next.js 14.2.33 (App Router) + React 18.3.1 + TypeScript 5.3.x
- **3D Rendering**: Three.js r169 (fixed version for stability)
- **Database**: Supabase (PostgreSQL 15) with Row Level Security
- **Deployment**: Vercel Serverless (optimized for Node.js 20.x)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components
- **API Pattern**: BFF (Backend for Frontend) with versioned endpoints

### Key Requirements
- Node.js v20.x LTS (required)
- TypeScript strict mode enabled
- Minimum 30 FPS on mobile devices
- API response time < 500ms for pricing calculations

## Essential Development Commands

### Core Development
```bash
npm run dev                    # Development server (port 3000)
PORT=3001 npm run dev         # Custom port
npm run build                 # Production build
npm run start                 # Production server
npm run build && npm run start # Test production locally
```

### Code Quality
```bash
npm run type-check            # TypeScript validation
npm run lint                  # ESLint check
npm run lint:fix              # Auto-fix linting issues
npm run prettier              # Format check
npm run prettier:fix          # Auto-format code
```

### Testing
```bash
# Unit Tests (Jest)
npm run test                  # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # Coverage report
npm run test -- path/to/test  # Specific test file
npm run test -- --testPathPattern=api/auth  # Pattern matching

# E2E Tests (Playwright)
npm run test:e2e              # Run E2E tests
npm run test:e2e:ui           # Interactive UI mode
npm run test:e2e:headed       # Show browser

# Storybook
npm run storybook             # Dev server (port 6006)
npm run build-storybook       # Build static Storybook
npx vitest run                # Component tests

# Pre-deployment validation
npm run build && npm run type-check && npm run lint
```

### API Testing
```bash
curl http://localhost:3000/api/health        # Health check
curl http://localhost:3000/api/db-test       # Database connection test
```

## Project Structure

### Key Directories
```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes (auth, v1, health, docs)
│   ├── configurator/        # 3D configurator page
│   └── [other pages]        # Cart, login, profile, etc.
├── components/
│   ├── ui/                  # Base UI components (shadcn/ui)
│   ├── three/               # 3D components (ThreeCanvas, DeskModel)
│   └── [feature components] # Auth, cart, pricing, designs, drawing
├── lib/
│   ├── api/                 # API utilities (auth, cache, rate-limit, validation)
│   ├── three/               # Three.js utilities (geometry, materials, controls)
│   ├── pricing/             # Pricing engine
│   ├── cart/                # Cart logic
│   └── drawing/             # PDF generation
└── types/                    # TypeScript definitions
```

## API Architecture

### Endpoint Structure
```
/api/
├── auth/                     # Authentication
│   ├── login (POST)
│   ├── logout (POST)
│   ├── register (POST)
│   ├── session (GET)
│   └── profile (GET/PUT)
├── v1/                       # Versioned API (requires auth)
│   ├── bff/configurator     # Aggregated configurator data
│   ├── cart/                # Cart operations
│   ├── checkout/            # Purchase flow
│   ├── designs/             # Design CRUD
│   ├── drawings/generate    # PDF generation
│   └── pricing/calculate    # Price calculation
├── health/                   # Health check
├── db-test/                 # Database test
└── docs/                     # Swagger documentation
```

### API Security
- JWT authentication for protected routes
- Zod validation for all inputs
- Rate limiting (5-10 req/min for cart operations)
- CSRF token protection
- Row Level Security in database

## 3D System & Materials

### Supported Materials (6 types)
- **Wood** (원목): coefficient 1.0
- **MDF**: coefficient 0.8
- **Steel** (스틸): coefficient 1.15
- **Metal** (메탈): coefficient 1.5
- **Glass** (유리): coefficient 2.0
- **Fabric** (패브릭): coefficient 0.8

### Pricing Formula
`Price = Width × Depth × Height × Material_Coefficient`

### Performance Requirements
- Mobile: minimum 30 FPS
- Real-time price updates with 500ms debouncing
- Optimized for Vercel serverless deployment

## Database Schema

### Core Tables
- `saved_design` - User designs with pricing, drawing, cart fields
- `pricing_policies` - Material pricing rules
- `purchase_requests` - Purchase history
- `drawing_jobs` - Async PDF generation
- `user_profiles` - Extended user information

### Storage
- Bucket: `drawings` - PDF drawing storage

## Environment Variables

Required in `.env.local`:
```bash
# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Application (Required)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=
CSRF_SECRET=

# Optional
JWT_SECRET=
OPENAI_API_KEY=
```

## Testing Requirements

### Coverage Targets
- **Global**: 80% lines, 70% branches/functions
- **API routes** (`src/app/api/**`): 90% lines, 80% branches
- **Libraries** (`src/lib/**`): 95% lines, 85% branches

### Test Structure
```
__tests__/
├── api/          # API route tests
├── lib/          # Library tests
├── components/   # Component tests
├── integration/  # Integration tests
├── performance/  # Performance tests
└── e2e/          # Playwright E2E tests
```

## Development Workflow

### Story-Driven Development
The project follows BMad Method™ with completed epics:
- ✅ Epic 1: Platform Infrastructure (Stories 1.1-1.4)
- ✅ Epic 2: 3D Configurator Core (Stories 2.1-2.2)
- ✅ Epic 3: Pricing & Purchase Integration (Story 3.1)
- ✅ Epic 4: Drawing Generation & Design Management (Story 4.1)
- ✅ Epic 5: Extended Materials System (integrated in 2.2)

### BMad Agent Commands
```bash
/BMad:agents:sm    # Story creation
/BMad:agents:po    # Story validation
/BMad:agents:dev   # Development
/BMad:agents:qa    # Quality assurance
```

### Documentation Locations
- User Stories: `docs/stories/`
- Architecture: `docs/architecture/`
- PRD: `docs/prd.md`
- QA Gates: `docs/qa/gates/`
- BMad Config: `.bmad-core/`

## Key Development Patterns

### BFF (Backend for Frontend)
- Location: `/api/v1/bff/`
- Purpose: Aggregate multiple services for frontend
- Example: `/api/v1/bff/configurator` combines materials, dimensions, pricing

### Error Handling
- Standardized error responses via `src/lib/api/errors.ts`
- Error boundaries for React components
- Comprehensive logging with environment-based levels

### Caching Strategy
- Memory cache with 5-minute TTL for general data
- Pricing policies cached for 1 hour
- API response caching configured per endpoint

### Performance Optimization
- Code splitting for 3D components
- Bundle optimization in `next.config.js`
- Serverless cold start warm-up strategies
- Image optimization with WebP/AVIF support

## Common Troubleshooting

### Database Connection Issues
1. Check `.env.local` has correct Supabase credentials
2. Test with `curl http://localhost:3000/api/db-test`
3. Verify RLS policies in Supabase dashboard

### 3D Performance Issues
1. Check Three.js version is exactly r169
2. Monitor FPS with performance tools in `src/lib/three/performance.ts`
3. Verify material textures are optimized

### Build Failures
1. Run full validation: `npm run build && npm run type-check && npm run lint`
2. Check Node.js version is v20.x
3. Clear cache: `rm -rf .next node_modules && npm install`

## Quick Reference

### Path Aliases
- `@/*` → `src/*` (use for all imports)

### Important Files
- API middleware: `src/middleware.ts`
- Auth context: `src/lib/auth-context.tsx`
- Supabase client: `src/lib/supabase.ts`
- Three.js setup: `src/components/three/ThreeCanvas.tsx`
- Pricing engine: `src/lib/pricing/`

### Deployment
- Platform: Vercel
- Build command: `npm run build`
- Install command: `npm install`
- Node.js version: 20.x