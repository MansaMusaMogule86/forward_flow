# Deploy Runbook - Forward Focus Elevation

## 1. Pre-Deploy Checklist

1. Install dependencies:
   - `npm install`
2. Validate code quality:
   - `npm run lint`
   - `npm test -- --run`
   - `npm run build`
3. Confirm required environment variables and Supabase secrets are set from `.env.example`.
4. Confirm latest edge functions are deployed in Supabase.

## 2. Deploy Steps

1. Open the project in Forward Focus publish flow.
2. Click Update/Publish.
3. Wait for deployment to complete.
4. Confirm production URL loads successfully.

## 3. Post-Deploy Smoke Test

1. Public pages:
   - Home, Support, Learn, Partners, Search
2. Authentication:
   - Sign up, sign in, sign out, password reset
3. AI features:
   - Coach Kay
   - Crisis Support
   - Reentry Navigator
   - AI Resource Discovery
4. Email flows:
   - Welcome email
   - Reminder email from admin
   - Unsubscribe flow
5. Admin:
   - Login as admin
   - Open security dashboard
   - Open email dashboard

## 4. Edge Functions Verification

1. Run the current checks in `EDGE_FUNCTIONS_TEST.md`.
2. Validate auth-required functions with valid JWTs.
3. Validate cron-token-protected functions with `x-cron-token` header.

## 5. Rollback Plan

1. If critical user-facing breakage occurs, revert to last known good deployment in hosting platform.
2. If edge function regression occurs:
   - Re-deploy previous function version from source control.
3. If schema issue occurs:
   - Restore from Supabase backup / point-in-time restore.
4. Pause non-critical automations:
   - Pause cron jobs for reminder/queue processors until stable.

## 6. Incident Log Template

- Timestamp:
- Environment:
- Issue summary:
- User impact:
- Mitigation applied:
- Final resolution:
- Follow-up action owner:
