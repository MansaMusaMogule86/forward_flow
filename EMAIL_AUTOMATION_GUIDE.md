# Email Automation System Guide

Complete guide for the automated email campaign system with triggers based on user actions.

## System Overview

**Simple, Automated Flow:**
1. User action triggers database function
2. Email queued with schedule
3. Cron job processes queue every 15 minutes
4. React Email template rendered
5. Email sent via Resend
6. Webhook captures delivery metrics

## Architecture

```
User Action → Database Trigger → Queue Email → Cron Processor → Resend API → User Inbox
                                                      ↓
                                              Webhook Events → Email Events Table → Analytics
```

## Automation Rules

### 1. Welcome Series (Signup Trigger)
- **Trigger:** New user creates account
- **Timing:** 5 minutes after signup
- **Template:** `WelcomeEmail.tsx`
- **Content:** Platform introduction, getting started guide, CTA to learning paths

### 2. Milestone Completion (Achievement Trigger)
- **Trigger:** User completes a learning module
- **Timing:** Immediate
- **Template:** `MilestoneEmail.tsx`
- **Content:** Congratulations, progress stats, encouragement, continue CTA

### 3. Inactivity Re-engagement (Time-based Trigger)
- **Trigger:** 7 days since last activity
- **Timing:** Daily check via cron
- **Template:** `InactivityEmail.tsx`
- **Content:** We miss you message, remind of available resources, comeback CTA

## Database Schema

### email_automation_rules
Configuration for each automation:
- `rule_name`: Unique identifier
- `trigger_type`: signup | milestone | inactivity
- `enabled`: On/off toggle
- `delay_minutes`: Wait time before sending
- `email_subject`: Email subject line
- `email_type`: Template to use

### email_automation_queue
Scheduled emails waiting to be sent:
- `user_id`: Recipient
- `rule_id`: Which automation triggered this
- `trigger_data`: Context for template (name, milestone details, etc.)
- `scheduled_for`: When to send
- `status`: pending | sent | failed | cancelled

## Edge Functions

### process-automation-queue
**Frequency:** Every 15 minutes via cron
**Purpose:** Send queued emails and check for inactive users

**Process:**
1. Fetch pending queue items (scheduled_for <= now)
2. For each item:
   - Load user profile and rule details
   - Render appropriate React Email template
   - Send via Resend API
   - Update queue status with result
3. Check for inactive users (>7 days)
4. Queue inactivity emails if not already sent

**Authentication:** Requires CRON_SECRET_TOKEN

### resend-webhook
**Purpose:** Capture email delivery events from Resend

**Events Tracked:**
- `email.sent` → sent
- `email.delivered` → delivered
- `email.opened` → opened
- `email.clicked` → clicked
- `email.bounced` → bounced
- `email.complained` → complained

## React Email Templates

All templates extend `BaseEmailTemplate` for consistent branding:

### BaseEmailTemplate
- Gradient header with logo
- Responsive container
- Branded footer with links
- Professional styling

### WelcomeEmail
- Personalized greeting
- Platform overview
- Getting started checklist
- Primary CTA to learning community

### MilestoneEmail
- Celebration design with emojis
- Achievement highlight
- Progress encouragement
- Continue learning CTA

### InactivityEmail
- Empathetic tone
- Reminder of available resources
- Low-pressure return CTA
- Support offer

## Admin Management

Access automation controls in **Admin Dashboard → Email tab → Automation**:

### Features:
1. **Real-time Stats**
   - Pending emails count
   - Sent today count
   - Failed emails requiring attention

2. **Rule Toggles**
   - Enable/disable each automation
   - View trigger types and delays
   - See email subjects

3. **Manual Processing**
   - "Process Queue Now" button
   - Useful for testing or immediate sends
   - Bypasses 15-minute cron schedule

4. **How It Works Info**
   - Documentation of each automation
   - Timing and trigger details

## Setup Checklist

- [x] Database tables created (`email_automation_rules`, `email_automation_queue`, `email_events`)
- [x] Database triggers configured (signup, milestone)
- [x] Edge functions deployed (`process-automation-queue`, `resend-webhook`)
- [x] Cron job scheduled (every 15 minutes)
- [x] React Email templates created
- [x] Admin UI components built
- [ ] **Resend webhook configured** (see instructions below)

## Resend Webhook Setup

**REQUIRED for email tracking:**

1. Go to https://resend.com/webhooks
2. Click "Add Webhook"
3. Enter webhook URL:
   ```
   https://peckmhkxhgkgopmjthmp.supabase.co/functions/v1/resend-webhook
   ```
4. Select events:
   - email.sent
   - email.delivered
   - email.opened
   - email.clicked
   - email.bounced
   - email.complained
5. Save webhook

## Testing

### Test Welcome Email
1. Create a new test user account
2. Wait 5 minutes (or trigger manually via Admin)
3. Check test user's email inbox
4. Verify welcome email received with proper branding

### Test Milestone Email
1. Sign in as a user
2. Complete a learning module
3. Check email immediately
4. Verify congratulations email received

### Test Inactivity Email
**Manual Test:**
```sql
-- Manually queue an inactivity email for testing
SELECT queue_automation_email(
  'YOUR_USER_ID'::uuid,
  'inactivity_7days',
  '{"name": "Test User", "email": "test@example.com", "days_inactive": 7}'::jsonb
);

-- Then process queue manually in Admin UI
```

### Verify Tracking
1. Send test emails
2. Open/click links in emails
3. Check Admin → Email → Deliverability Dashboard
4. Verify events appear (may take 1-2 minutes for webhook)

## Monitoring & Maintenance

### Daily Checks
- Review failed email count in dashboard
- Check bounce/complaint rates
- Ensure delivery rate stays >95%

### Weekly Reviews
- Analyze open/click rates by email type
- Review inactive user re-engagement success
- Adjust automation timings if needed

### Monthly Optimization
- A/B test email subject lines
- Refine template content based on engagement
- Update automation rules based on user feedback

## Troubleshooting

### Emails Not Sending
1. Check `email_automation_rules` - ensure rule is `enabled = true`
2. Check `email_automation_queue` - verify items are `status = pending`
3. Check cron job is running: Query `cron.job` table
4. Check edge function logs in Admin → Security
5. Verify `RESEND_API_KEY` secret is configured

### Low Open Rates
- Improve subject lines (test variations)
- Check send timing (avoid off-hours)
- Verify sender reputation in Resend
- Ensure content is relevant and valuable

### High Bounce Rates (>5%)
- Validate email addresses before sending
- Remove bounced addresses from lists
- Check domain authentication in Resend
- Review email format and size

## Customization

### Add New Automation Rule

**1. Create Template:**
```typescript
// supabase/functions/_shared/email-templates/MyTemplate.tsx
export const MyTemplate = ({ name, customData }) => (
  <BaseEmailTemplate previewText="..." heading="...">
    {/* Your content */}
  </BaseEmailTemplate>
);
```

**2. Add to Database:**
```sql
INSERT INTO email_automation_rules (
  rule_name, trigger_type, delay_minutes, 
  email_subject, email_type, enabled
) VALUES (
  'my_custom_rule', 'custom', 0,
  'Your Subject Line', 'mycustom', true
);
```

**3. Update Processor:**
Add case to `process-automation-queue/index.ts`:
```typescript
case 'mycustom':
  emailHtml = await renderAsync(
    React.createElement(MyTemplate, { name, customData })
  );
  break;
```

**4. Create Trigger (Optional):**
```sql
CREATE FUNCTION trigger_my_automation() RETURNS TRIGGER AS $$
BEGIN
  PERFORM queue_automation_email(
    NEW.user_id,
    'my_custom_rule',
    jsonb_build_object('name', NEW.name, 'customData', NEW.data)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_my_table_event
  AFTER INSERT ON my_table
  FOR EACH ROW
  EXECUTE FUNCTION trigger_my_automation();
```

## Performance Optimization

### Current Efficiency
- Batch processing: 50 emails per cron run
- Template caching: React Email renders once per send
- Indexed queries: Fast queue lookups
- Background webhooks: Non-blocking event capture

### Scaling Considerations
- **<1K users:** Current setup handles easily
- **1K-10K users:** Consider increasing cron frequency to every 5 minutes
- **10K+ users:** Implement queue sharding or dedicated worker
- **100K+ users:** Use Resend batch API and multiple workers

## Cost Estimates

**Resend Pricing (as of 2025):**
- 100 emails/day: Free
- 1,000 emails/month: $20/mo
- 10,000 emails/month: $80/mo

**Typical Usage:**
- Signup: 1 email per new user
- Milestone: 0-10 emails per user per month
- Inactivity: 1 email per inactive user per week
- Total: ~15-20 emails per active user per month

## Security

- Queue items linked to profiles (RLS enforced)
- Cron endpoint requires secret token
- Admin-only access to automation controls
- No sensitive data in email content
- Webhook validates Resend signatures

## Support

Questions or issues?
- Email: support@ffeservices.net
- Check Admin Dashboard → Email → Automation for queue status
- Review edge function logs for detailed error messages
