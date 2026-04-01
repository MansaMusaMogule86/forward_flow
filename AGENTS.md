# AGENTS.md - Forward Focus Foundation

## Project Overview

Forward Focus Foundation is a React + TypeScript web application for a nonprofit organization focused on youth support, victim services, crisis resources, and community partnerships. It uses Supabase as the backend and is deployed on Vercel.

## Tech Stack

- **Framework:** React 18 + TypeScript (strict mode OFF)
- **Build:** Vite 5 (with SWC plugin)
- **Styling:** Tailwind CSS 3 + shadcn/ui (Radix UI primitives)
- **State/Data:** TanStack React Query, React Router DOM 6, React Hook Form + Zod
- **Backend:** Supabase (auth, database, edge functions)
- **Testing:** Bun test runner
- **Package Manager:** Bun

## Project Structure

```
src/
  pages/          - Route-level page components (33 pages)
  components/     - Feature components organized by domain:
    about/        - About page components
    admin/        - Admin dashboard components
    ai/           - AI-related components
    auth/         - Authentication (ProtectedRoute, AuthenticatedRoute)
    forms/        - Form components
    healing/      - Healing hub components
    help/         - Help/crisis components
    home/         - Homepage components
    launch/       - Launch-related components
    layout/       - Layout shell (Layout, AnalyticsProvider)
    learn/        - Learning/education components
    partner/      - Partner portal components
    resources/    - Resource listing components
    safety/       - Safety-related components
    security/     - Security providers (SecurityProvider, SessionSecurityProvider, AntiWhiteLabelProtection)
    seo/          - SEO/Helmet components
    support/      - Support page components
    ui/           - shadcn/ui primitives + custom UI components
    youth/        - Youth program components
  contexts/       - React contexts (AuthContext, StateContext)
  hooks/          - Custom hooks
  lib/            - Utilities (utils, security, text-parser, validation)
  config/         - App configuration
  data/           - Static data
  integrations/   - External service integrations (Supabase client)
  types/          - TypeScript type definitions
  assets/         - Static assets (images)
supabase/
  functions/      - Supabase Edge Functions (Deno)
  migrations/     - SQL migration files
```

## Key Conventions

### Path Aliases
- `@/*` maps to `./src/*` (use `@/components/...`, `@/lib/...`, etc.)

### Component Patterns
- Pages are lazy-loaded except for critical routes (Index, NotFound, GetHelpNow, Auth, AuthDebug)
- Use `ProtectedRoute` with `requiredRole` for admin-only pages
- Use `AuthenticatedRoute` for partner/authenticated user pages
- Error boundaries: `BrandedErrorBoundary` wraps the entire app
- Loading states: `PageLoadingSkeleton` as Suspense fallback

### Styling
- Use Tailwind CSS utility classes
- shadcn/ui components live in `src/components/ui/`
- Custom brand colors: `osu-scarlet`, `osu-gray`, `cream`, `navy`
- Fonts: Cormorant Garamond (display/serif), Outfit (body/sans), DM Mono (mono)
- CSS variables defined in `src/index.css` for theming

### TypeScript Config
- `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`
- `noEmit: true` (type-checking only, Vite handles bundling)
- `skipLibCheck: true`

### ESLint Rules
- `@typescript-eslint/no-unused-vars: off`
- `@typescript-eslint/no-explicit-any: off`
- React hooks rules enforced
- React refresh export warnings enabled

## Commands

```bash
# Development
bun dev              # Start dev server (port 8080)

# Build
bun run build        # Production build
bun run build:dev    # Development build

# Quality Checks
bun run lint         # ESLint
bun test             # Run tests (Bun test runner)

# Preview
bun run preview      # Preview production build
```

## Environment

- Dev server runs on `http://localhost:8080`
- HMR WebSocket on port 8082
- Supabase connection configured via `.env` / `.env.local`

## Testing

- Tests live in `src/lib/__tests__/`
- Run with `bun test`
- Current test files: `validationSchemas.test.ts`, `security.test.ts`

## Security

- SecurityProvider and SessionSecurityProvider wrap the app
- AntiWhiteLabelProtection component for domain verification
- Input sanitization in `src/lib/security.ts`
- DOMPurify used for HTML sanitization
- Rate limiting and session management built-in

## Edge Functions (Supabase/Deno)

Located in `supabase/functions/`:
- `ai-recommend-resources`, `ai-resource-discovery` - AI-powered features
- `chat`, `coach-k` - Conversational AI
- `crisis-emergency-ai`, `crisis-support-ai` - Crisis support
- `create-donation-payment` - Payment processing
- `process-email-queue` - Email automation
- `generate-marketing-image` - Image generation
- And more...

## Important Notes

- Do NOT commit `.env`, `.env.local`, or secrets
- The project uses Lovable (`.lovable/` directory) - do not modify Lovable config
- Vercel deployment config in `vercel.json`
- Bun lockfile: `bun.lock`
