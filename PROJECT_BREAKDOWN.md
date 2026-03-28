# ForwardFocus Foundation — Project Breakdown
_Analysis date: 2026-03-28_

---

## Stack Overview

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Edge Functions | Supabase Edge Functions (Deno) |
| AI | Claude via Lovable AI Gateway |
| Email | Resend |
| Payments | Stripe (create-donation-payment function) |
| Analytics | Web Vitals + custom hooks |

---

## TEAM BREAKDOWN

| Role | Owns |
|------|------|
| **Frontend Lead** | Pages, components, routing, UI/UX, theming |
| **Backend Lead** | Supabase schema, RLS policies, migrations |
| **Data Engineer** | Edge functions, email queues, AI integrations |
| **Security Engineer** | Auth, MFA, rate limiting, audit logs, CSP |
| **Debug Engineer** | Dead code, broken imports, orphaned routes, duplicates |

---

## GANTT 1 — FRONTEND

```
TASK                                        STATUS      PRIORITY
──────────────────────────────────────────────────────────────────
Pages & Routing
  Add /youth-elevation route                FIXED ✓     CRITICAL
  Connect ResourceDetail page or remove     OPEN        LOW
  YouthFutures vs YouthElevation clarity   OPEN        LOW

Components
  Remove dead error-boundary.tsx            FIXED ✓     HIGH
  Remove dead enhanced-error-boundary.tsx   FIXED ✓     HIGH
  Fix NewsletterPopup use-toast import      FIXED ✓     HIGH
  Fix YouthGames use-toast import           FIXED ✓     HIGH
  Consolidate CrisisEmergencyBot/SupportAI  OPEN        MEDIUM
    (different roles: Header vs page)
  AntiWhiteLabelProtection re-enable?       OPEN        MEDIUM
    (commented out App.tsx:68)

UI/Design
  ChatbotPopup — verify active on all pages OPEN        MEDIUM
  AskCoachKay — verify active               OPEN        MEDIUM
  CookieConsentBanner — verify integration  OPEN        LOW

Performance
  index.js chunk 421 kB (too large)         OPEN        HIGH
  charts chunk 411 kB (needs lazy split)    OPEN        HIGH
  VictimServices 67 kB (heaviest page)      OPEN        MEDIUM
  Support 60 kB (second heaviest)           OPEN        MEDIUM
  EmailMarketingDashboard 70 kB             OPEN        LOW
```

---

## GANTT 2 — BACKEND (Supabase)

```
TASK                                        STATUS      PRIORITY
──────────────────────────────────────────────────────────────────
Schema / Tables (from types.ts)
  account_lockouts                          ACTIVE      —
  admin_ip_whitelist                        ACTIVE      —
  ai_rate_limits                            ACTIVE      —
  profiles                                  ACTIVE      —
  resources                                 ACTIVE      —
  partner_organizations                     ACTIVE      —
  contact_requests / access_requests        ACTIVE      —
  email_queue / automation_queue            ACTIVE      —
  audit_logs                                ACTIVE      —
  success_stories                           ACTIVE      —
  mfa_settings                              ACTIVE      —
  learning_progress                         ACTIVE      —

Auth
  MFA (TOTP) setup flow                     ACTIVE      —
  Session security provider                 ACTIVE      —
  Account lockout after failed attempts     ACTIVE      —
  Admin IP whitelist enforcement            ACTIVE      —

RLS Policies
  Verify all tables have RLS enabled        OPEN        HIGH
  Audit public-read tables for exposure     OPEN        HIGH

Migrations
  100+ migrations present (Aug 2025–Mar 2026) — healthy cadence
  Two migrations with empty names (20250813) OPEN       LOW
    → rename for clarity
```

---

## GANTT 3 — DATA / EDGE FUNCTIONS

```
FUNCTION                                    STATUS      NOTES
──────────────────────────────────────────────────────────────────
AI Functions
  chat/                                     ACTIVE      General chat
  coach-k/                                  ACTIVE      Coach Kay AI
  crisis-support-ai/                        ACTIVE      Crisis support
  crisis-emergency-ai/                      ACTIVE      Emergency bot
  reentry-navigator-ai/                     ACTIVE      Reentry help
  victim-support-ai/                        ACTIVE      Victim services
  partner-support-chat/                     ACTIVE      Partner chatbot
  ai-recommend-resources/                   ACTIVE      AI recommendations
  ai-resource-discovery/                    ACTIVE      AI discovery
  generate-success-story/                   ACTIVE      Story AI
  generate-marketing-image/                 ACTIVE      Image AI

Email Functions
  send-contact-email/                       ACTIVE      Contact form
  send-auth-email/                          ACTIVE      Auth emails
  send-partnership-email/                   ACTIVE      Partnership
  send-referral-notification/               ACTIVE      Referrals
  send-resource-notification/               ACTIVE      Resources
  send-verification-email/                  ACTIVE      Verification
  send-support-email/                       ACTIVE      Support form
  send-reminder-emails/                     ACTIVE      Reminder queue
  process-email-queue/                      ACTIVE      Queue processor
  process-automation-queue/                 ACTIVE      Automation
  resend-webhook/                           ACTIVE      Delivery tracking

Other Functions
  create-donation-payment/                  ACTIVE      Stripe
  validate-auth-security/                   ACTIVE      Auth security
  check-verification-expiration/            ACTIVE      Cron job

Shared
  _shared/email-templates/                  ACTIVE      4 templates
  _shared/rate-limit.ts                     ACTIVE      Rate limiting
  _shared/utils.ts                          ACTIVE      Shared utils
  _shared/site-config.ts                    ACTIVE      Site config

Issues Found
  email-templates.ts at _shared root +      OPEN        LOW
    email-templates/ folder both exist
    → verify no duplication of template logic
```

---

## GANTT 4 — DEBUG (Issues Found & Fixed)

```
ISSUE                                       STATUS      SEVERITY
──────────────────────────────────────────────────────────────────
FIXED
  YouthElevation page: imported, no route   FIXED ✓     CRITICAL
  error-boundary.tsx: zero imports, dead    FIXED ✓     HIGH
  enhanced-error-boundary.tsx: dead code    FIXED ✓     HIGH
  NewsletterPopup: wrong use-toast path     FIXED ✓     HIGH
  YouthGames: wrong use-toast path          FIXED ✓     HIGH
  verify_healing.py: stale script in root   FIXED ✓     MEDIUM
  package-lock.json: project uses bun       FIXED ✓     MEDIUM

OPEN
  Two empty-name migration files            OPEN        LOW
    20250813051313-.sql
    20250813052600-.sql

FIXED
  ResourceDetail.tsx exists but unreachable FIXED ✓     MEDIUM
    Deleted — route redirects to /help, page was dead

  AntiWhiteLabelProtection commented out    FIXED ✓     MEDIUM
    Added explanatory comment in App.tsx (console.log
    override issue; re-enable after prod domain confirmed)

  bun.lock + bun.lockb both present         FIXED ✓     LOW
    Deleted bun.lockb — kept bun.lock (text format)

  email-templates.ts vs email-templates/    FIXED ✓     LOW
    Audited — different systems (HTML strings vs JSX)
    Both valid, no duplication of logic

  src/components/ui/use-toast.ts dead stub  FIXED ✓     HIGH
    Deleted — was re-export only, 0 imports remaining

  AuthDebug publicly accessible             FIXED ✓     HIGH
    Now wrapped in ProtectedRoute requiredRole="admin"
```

---

## GANTT 5 — SECURITY

```
ITEM                                        STATUS      PRIORITY
──────────────────────────────────────────────────────────────────
Authentication
  Supabase Auth + custom profiles           ACTIVE      —
  MFA (TOTP) via MFASetup/MFASettings       ACTIVE      —
  Session idle timeout                      ACTIVE      —
  Account lockout (account_lockouts table)  ACTIVE      —
  Admin IP whitelist                        ACTIVE      —
  Rate limiting on AI endpoints             ACTIVE      —
  SimpleCaptcha on forms                    ACTIVE      —

Data Protection
  DOMPurify XSS sanitization               ACTIVE      —
  Input validation with Zod schemas         ACTIVE      —
  Contact info masking                      ACTIVE      —
  CSRF token generation (client-side)       PARTIAL     MEDIUM
    → real protection requires server-side validation

Audit & Monitoring
  SecurityMonitoringDashboard               ACTIVE      —
  AuditLogViewer                            ACTIVE      —
  LoginSecurityMonitor                      ACTIVE      —
  RealtimeNotifications                     ACTIVE      —

Anti-Abuse
  AntiWhiteLabelProtection                  DISABLED    MEDIUM
    (commented out — re-evaluate)
  Contact access justification flow         ACTIVE      —
  Partner verification process              ACTIVE      —

Headers / CSP
  security-headers.ts exists                ACTIVE      —
  Verify these are applied server-side      OPEN        HIGH
    (Vite dev server ≠ production headers)
  No vercel.json / netlify.toml / nginx     OPEN        HIGH
    config found → headers may not deploy
```

---

## GANTT 6 — CONTENT & DATA INTEGRITY

```
ITEM                                        STATUS      NOTES
──────────────────────────────────────────────────────────────────
Pages (27 total)
  Index / Home                              ACTIVE
  GetHelpNow (/help)                        ACTIVE
  VictimServices                            ACTIVE
  LearnGrow (/learn)                        ACTIVE
  YouthFutures                              ACTIVE
  YouthElevation                            ACTIVE (route fixed)
  AboutUs                                   ACTIVE
  Support                                   ACTIVE
  Partners                                  ACTIVE
  PartnerDashboard (auth-protected)         ACTIVE
  Admin (admin-only)                        ACTIVE
  Search / Discover                         ACTIVE
  Organizations                             ACTIVE
  SuccessStories                            ACTIVE
  Auth / Register / PartnerSignIn/Up        ACTIVE
  RequestPartnership / Verification         ACTIVE
  PrivacyPolicy / TermsOfService            ACTIVE
  DonationSuccess                           ACTIVE
  SetupAdmin / SetupGuide / AdminGuide      ACTIVE (internal tools)
  AuthDebug                                 ACTIVE (admin-only, ProtectedRoute)
  Welcome                                   ACTIVE
  ResourceDetail                            ORPHANED (route redirects away)

Redirects in place
  /get-help-now → /help
  /healing-hub  → /victim-services
  /the-collective → /learn
  /youth → /youth-futures
  /login → /auth
  /resources/:id → /help (ResourceDetail bypassed)

Stale Root Files (documentation)
  API_KEY_ROTATION_GUIDE.md                 STALE — keep or archive
  BRAND_DNA_AUDIT.md                        STALE
  CODE_AUDIT.md                             STALE
  CRON_JOB_SETUP.md                         USEFUL — keep
  EDGE_FUNCTIONS_TEST.md                    STALE
  EMAIL_AUTOMATION_GUIDE.md                 USEFUL
  EMAIL_AUTOMATION_SETUP.md                 USEFUL
  EMAIL_TRACKING_SETUP.md                   USEFUL
  LAUNCH_TONIGHT_CHECKLIST.md              STALE (launch done)
  MARKET_READINESS_AUDIT.md                STALE
  SECURITY_AUDIT.md                         USEFUL — keep
  SECURITY_HARDENING_SUMMARY.md            USEFUL — keep
  SUPABASE_AUTH_SETUP.md                   USEFUL
```

---

## PRIORITY ACTION LIST

### Do Now (Critical/High)
- [x] Add /youth-elevation route ← **DONE**
- [x] Remove dead error boundaries ← **DONE**
- [x] Fix use-toast import paths ← **DONE**
- [x] Remove stale dev files ← **DONE**
- [ ] Verify security headers deploy to production (no nginx/vercel/netlify config)
- [ ] Audit RLS policies on all Supabase tables

### Do Soon (Medium)
- [x] AntiWhiteLabelProtection — left disabled, added explanatory comment (console.log override; re-enable after prod domain confirmed) ← **DONE**
- [x] Delete `ResourceDetail.tsx` — orphaned page, route redirects to /help ← **DONE**
- [x] `src/components/ui/use-toast.ts` — deleted (was re-export stub, 0 imports remaining) ← **DONE**
- [x] Gate `AuthDebug` page behind `ProtectedRoute requiredRole="admin"` ← **DONE**
- [ ] Split large JS chunks (charts: 411 kB, index: 421 kB) — vite.config already has manualChunks; sizes are library-inherent
- [ ] Verify security headers apply in production (no vercel.json/netlify.toml/nginx config)

### Do Later (Low)
- [x] Remove `bun.lockb` — kept `bun.lock` (text format) ← **DONE**
- [ ] Rename the two empty-name migration files (20250813051313-.sql, 20250813052600-.sql)
- [ ] Audit `_shared/email-templates.ts` vs `_shared/email-templates/` folder — confirmed different systems (HTML strings vs JSX), both valid
- [ ] Archive stale root `.md` files to a `docs/` folder
