

# Plan: Execute 9 Diagnostic Fixes in Priority Order

## Fix 1: Remove Newsletter Popup from Layout
- **File**: `src/components/layout/Layout.tsx`
- Remove the `NewsletterPopup` import and `<NewsletterPopup />` render (it was already removed in a previous edit -- confirming it's gone; only `CookieConsentBanner` remains)
- **Verdict**: Layout.tsx already has no NewsletterPopup. No change needed here. But the `NewsletterPopup.tsx` file still exists and may be imported elsewhere. Will search and confirm it's not rendered anywhere.

## Fix 2: Fix Support Page Dialog Closing
- **File**: `src/pages/Support.tsx`
- **Root cause**: Cards have `onClick={() => setActiveDialog('...')}` AND contain the `<Dialog>` inside. Click on overlay bubbles to card, re-opens dialog.
- **Fix**: Remove `onClick` from all 6 Cards (lines 66, 96, 115, 145, 175, 205). Keep only the `<DialogTrigger>` buttons as the open mechanism. The hero buttons (lines 45, 52) already work via `setActiveDialog` so those stay. Also add `onClick={(e) => e.stopPropagation()}` on DialogContent elements as a safety net.

## Fix 3: Remove AIWithTrial Blocker from Coach Kay
- **File**: `src/components/ui/AskCoachKay.tsx`
- **Root cause**: `AIWithTrial` wrapper blocks anonymous users after 5 min trial. `canUseAI` becomes `false`, disabling input.
- **Fix**: Remove `AIWithTrial` wrapper entirely. Refactor `AskCoachKay` to be a simple component that always allows chatting. Server-side rate limiting (`check_ai_rate_limit`) already protects against abuse. Remove trial-related UI (turn counter, trial badge).

## Fix 4: Fix CrisisSupportAI and VictimSupportAI Stuck "Thinking"
- **Files**: `src/components/ai/CrisisSupportAI.tsx`, `src/components/ai/VictimSupportAI.tsx`
- **Root cause**: On error, both components add a NEW message via `setMessages(prev => [...prev, aiMessage])` instead of updating the existing placeholder ("Alex is thinking..." / "Thinking..."). This leaves the placeholder visible AND adds an error below.
- **Fix**: In the error handlers (catch blocks), change from adding new messages to updating the last AI message (same pattern used in the success path: find last AI message and update its content). Both files need this in 2 places (main catch + fallback catch).

## Fix 5: Fix Registration Welcome Email
- **File**: `src/pages/Register.tsx`
- **Root cause**: After `signUp()`, email confirmation is required so no session exists yet. `sessionData?.session?.access_token` is `null`, welcome email silently fails.
- **Fix**: Use the anon key (`import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`) for Authorization instead of session JWT. The `send-auth-email` function has `verify_jwt = false` so anon key works. Also improve post-signup messaging to say "Check your email to verify your account."

## Fix 6: Replace BookingCalendar with Calendly Popup
- **File**: `src/components/ui/BookingCalendar.tsx`
- **Root cause**: Custom calendar inserts into `bookings` table with `crypto.randomUUID()` as `user_id` for anonymous users, which fails RLS.
- **Fix**: Replace the entire BookingCalendar component with a simple button that opens the Calendly popup using the existing `useCalendlyPopup` hook and the current Calendly URL (`https://calendly.com/ffe_coach_kay/free-call`). This works for both anonymous and authenticated users.

## Fix 7: Fix Youth Games CareerQuizGame SSE Parsing
- **File**: `src/components/youth/YouthGames.tsx` + `supabase/functions/chat/index.ts`
- **Root cause**: `chat` edge function streams SSE (`stream: true`), but `supabase.functions.invoke()` doesn't handle SSE -- it tries to parse the entire response as JSON. The parsing chain (`data?.choices?.[0]?.message?.content`) fails because `data` is raw SSE text.
- **Fix**: Change the `chat` edge function to accept an optional `stream: false` parameter. When `stream` is `false`, return a regular JSON response. Update `CareerQuizGame` to pass `stream: false` in its request body. This preserves streaming for Coach Kay (which handles SSE manually via `fetch`) while fixing the game.

## Fix 8: Skip (no API keys yet)

## Fix 9: Fix ReentryNavigatorAI Close Behavior
- **File**: `src/components/ai/ReentryNavigatorAI.tsx`
- **Root cause**: `handleCloseRequest` sets `pendingCloseRef.current = true` and opens email modal. The email modal's `onClose` checks `pendingCloseRef.current` and calls `finalizeClose()`. This actually works correctly based on code review (lines 600-608). However, if user dismisses the Dialog overlay directly (not the X button), `onOpenChange` calls `handleCloseRequest` which forces the email modal open -- this feels stuck because the user can't just close without the email modal appearing.
- **Fix**: Make email modal optional on close. Only show email modal if user explicitly clicks X button. For overlay/escape dismissal, close directly without email modal prompt.

## Fix 10: Deduplicate Analytics Events
- **File**: `src/hooks/useAnalytics.ts`
- **Root cause**: `trackEvent` is in the dependency array of `useEffect` for page views, and `trackEvent` itself depends on `location?.pathname`. This creates a cycle where `trackEvent` is recreated on every render, triggering the `useEffect` again, causing duplicate `page_view` events.
- **Fix**: Add a `lastTrackedPath` ref to deduplicate. Only fire `page_view` if the pathname actually changed since the last tracked event. Also stabilize `trackEvent` by removing `location?.pathname` from its deps (read it at call time instead).

---

## Technical Details

### Files Modified (9 files + 1 edge function)
1. `src/components/layout/Layout.tsx` -- verify no newsletter (already clean)
2. `src/pages/Support.tsx` -- remove `onClick` from Cards
3. `src/components/ui/AskCoachKay.tsx` -- remove AIWithTrial wrapper
4. `src/components/ai/CrisisSupportAI.tsx` -- update error handler
5. `src/components/ai/VictimSupportAI.tsx` -- update error handler
6. `src/pages/Register.tsx` -- use anon key for welcome email
7. `src/components/ui/BookingCalendar.tsx` -- replace with Calendly button
8. `src/components/youth/YouthGames.tsx` -- pass `stream: false`
9. `supabase/functions/chat/index.ts` -- add `stream` parameter support
10. `src/components/ai/ReentryNavigatorAI.tsx` -- fix close behavior
11. `src/hooks/useAnalytics.ts` -- deduplicate page views

### Risk Assessment
- All fixes are isolated to their respective components
- No database migrations needed
- Edge function change is backward-compatible (defaults to `stream: true`)
- Coach Kay streaming continues to work (uses direct `fetch`, not `supabase.functions.invoke`)

