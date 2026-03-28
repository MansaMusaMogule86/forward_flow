# Final Project TODO - Forward Focus Elevation

Date: 2026-03-28
Scope: full repo pass (folder-by-folder + file-by-file hotspot review + md-by-md review)

## 1) Current Reality Snapshot

- Build: PASS (`npm run build`)
- Tests: PASS (`29 pass / 0 fail`)
- Lint: FAIL (1 error, 37 warnings)
- Launch docs: present but several checklists are still unchecked and some docs are stale-dated (2025)
- Deployment/ops artifacts: missing `.env.example`, missing deploy runbook, no CI workflow folder

## 2) Must Fix Before Launch (P0)

- [x] Fix lint error in `tailwind.config.ts` (`require()` usage for `tailwindcss-animate`)
- [x] Create `.env.example` with all required env vars (frontend + Supabase + AI + email)
- [x] Re-enable or intentionally remove `AntiWhiteLabelProtection` in `src/App.tsx` (currently commented with note)
- [ ] Run the launch checklist in `LAUNCH_TONIGHT_CHECKLIST.md` and check off every completed item
- [ ] Run the edge test plan in `EDGE_FUNCTIONS_TEST.md` and record real PASS/FAIL results for today
- [ ] Verify cron/manual email flow from `CRON_JOB_SETUP.md` and complete launch-week validation checklist

## 3) High Priority (P1 - First 48 Hours)

- [x] Add `DEPLOY.md` (production deploy + rollback + smoke test steps)
- [ ] Add `.github/workflows/` CI for lint, test, build
- [ ] Add `supabase/functions/README.md` with auth/secrets/test matrix per function
- [ ] Add `supabase/migrations/README.md` with migration naming and rollback policy
- [ ] Replace high-risk `console.*` paths with central logger usage (`~321` console calls currently)
- [ ] Validate production security headers after deploy (not only app-side configuration)

## 4) Folder-by-Folder TODO

### Root

- [x] Add `.env.example`
- [x] Add `DEPLOY.md`
- [ ] Add CI workflows under `.github/workflows/`
- [ ] Keep launch/security/email docs but update stale dates and status sections

### src/components

- [ ] Triage React hook dependency warnings in admin/security/ai components
- [ ] Confirm all chatbot entry points are reachable in UI flows (Coach Kay, Crisis, Resource Discovery, Partner Support)
- [ ] Convert the most critical `console.error` calls to centralized logging first (auth, payments, edge invoke paths)

### src/pages

- [ ] Run manual smoke pass on auth, support, victim services, partners, admin, launch pages
- [ ] Re-verify mobile behavior on pages with heavier AI/chat interactions

### src/lib

- [ ] Keep current unit tests passing (`src/lib/__tests__`)
- [ ] Add tests for any newly touched security/session/logging utilities

### src/hooks

- [ ] Add focused tests for high-risk hooks (`useAuthSecurity`, `useAnalytics`, `usePerformanceMonitoring`)

### supabase/functions

- [ ] Add function-level docs for required secrets, auth mode, rate limits, and sample payloads
- [ ] Verify all launch-critical functions against current contracts (especially AI and email functions)

### supabase/migrations

- [ ] Document current schema baseline and rollback notes
- [ ] Decide whether to rename/archive ambiguous historical migration filenames

### public

- [ ] Final asset validation in production domain (`manifest`, `robots`, `sitemap`, `sw.js`, key images)

## 5) File-by-File Hotspot TODO (Concrete Files)

- [ ] `tailwind.config.ts`: replace `require("tailwindcss-animate")` with import-compatible pattern for lint compliance
- [x] `src/App.tsx`: finalize `AntiWhiteLabelProtection` decision (enable/remove/document)
- [ ] `src/components/ai/AIResourceDiscovery.tsx`: keep contract fallback behavior and add regression test note
- [ ] `src/components/launch/LaunchChecklist.tsx`: verify health-check payloads still match edge contracts
- [ ] `src/components/ui/navigation-menu.tsx`: quick visual QA for dropdown alignment on desktop + mobile
- [ ] `src/pages/VictimServices.tsx`: verify CTA contrast in both image and non-image contexts
- [ ] `supabase/config.toml`: add comments for any `verify_jwt = false` functions and operational rationale
- [ ] `package.json`: ensure scripts include stable CI sequence (`lint`, `test`, `build`)

## 6) Markdown-by-Markdown Status (md-by-md)

- [ ] `README.md` -> UPDATE (currently generic Lovable intro; add project-specific setup/deploy links)
- [ ] `LAUNCH_TONIGHT_CHECKLIST.md` -> EXECUTE + CHECK OFF (primary launch checklist; many unchecked items)
- [ ] `EDGE_FUNCTIONS_TEST.md` -> EXECUTE + UPDATE DATE/RESULTS (currently older test date references)
- [ ] `CRON_JOB_SETUP.md` -> EXECUTE + CHECK OFF (remaining operational checks are open)
- [ ] `EMAIL_AUTOMATION_SETUP.md` -> EXECUTE + CHECK OFF (launch validation items still open)
- [ ] `EMAIL_AUTOMATION_GUIDE.md` -> VERIFY (confirm webhook status and current provider settings)
- [ ] `EMAIL_TRACKING_SETUP.md` -> VERIFY (confirm tracking/webhook events in current environment)
- [ ] `SUPABASE_AUTH_SETUP.md` -> KEEP (update only if auth flow changed)
- [ ] `API_KEY_ROTATION_GUIDE.md` -> KEEP (confirm current key owner + next rotation date)
- [ ] `SECURITY_AUDIT.md` -> KEEP + ADD 2026 addendum
- [ ] `SECURITY_HARDENING_SUMMARY.md` -> KEEP + VERIFY no regressions since last update
- [ ] `MARKET_READINESS_AUDIT.md` -> UPDATE (refresh dated claims)
- [ ] `CODE_AUDIT.md` -> UPDATE (re-run findings against current code)
- [ ] `BRAND_DNA_AUDIT.md` -> KEEP (brand direction reference)
- [ ] `PROJECT_BREAKDOWN.md` -> UPDATE or ARCHIVE (contains historical OPEN items; align with current state)

## 7) Launch Execution Order (Suggested)

- [x] Step 1: Fix lint blocker (`tailwind.config.ts`)
- [x] Step 2: Add `.env.example` and `DEPLOY.md`
- [ ] Step 3: Run/complete `LAUNCH_TONIGHT_CHECKLIST.md`
- [ ] Step 4: Run/complete `EDGE_FUNCTIONS_TEST.md`
- [ ] Step 5: Run/complete `CRON_JOB_SETUP.md` + `EMAIL_AUTOMATION_SETUP.md`
- [ ] Step 6: Commit launch docs with real-time dated results

## 8) Definition of Done (Tonight)

- [x] `npm run lint` passes with zero errors
- [x] `npm test -- --run` passes
- [x] `npm run build` passes
- [ ] All launch-critical markdown checklists are checked with real execution results
- [ ] Production deploy runbook and env template exist in repo
