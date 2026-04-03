# Email Tracking & Deliverability Setup

This guide explains how to set up automated email tracking with Resend webhooks to monitor deliverability, open rates, and engagement metrics.

## Architecture Overview

1. **React Email Templates**: Professional, branded email templates using React components
2. **Resend Integration**: Transactional email service with tracking capabilities
3. **Webhook Handler**: Edge function that captures email events from Resend
4. **Database Storage**: Email events stored in `email_events` table
5. **Admin Dashboard**: Real-time monitoring of email metrics and performance

## Setup Instructions

### 1. Configure Resend Webhook

1. Go to your Resend dashboard: https://resend.com/webhooks
2. Click "Add Webhook"
3. Enter the webhook URL:
   ```
   https://peckmhkxhgkgopmjthmp.supabase.co/functions/v1/resend-webhook
   ```
4. Select the following events to track:
   - ✅ `email.sent` - Email successfully sent
   - ✅ `email.delivered` - Email delivered to recipient
   - ✅ `email.delivery_delayed` - Delivery delayed
   - ✅ `email.bounced` - Email bounced
   - ✅ `email.opened` - Recipient opened the email
   - ✅ `email.clicked` - Recipient clicked a link
   - ✅ `email.complained` - Recipient marked as spam

5. Save the webhook configuration

### 2. Verify Webhook Integration

Send a test email through the contact form:
1. Go to the website contact page
2. Submit a contact form
3. Check the Admin Dashboard → Email tab → Deliverability Dashboard
4. You should see events appearing in real-time as the email is sent, delivered, and opened

### 3. Monitor Email Performance

Access the Email Deliverability Dashboard:
1. Navigate to `/admin` (requires admin privileges)
2. Click the "📧 Email" tab
3. View the **Email Deliverability Dashboard** at the top

**Key Metrics Available:**
- **Total Sent**: Number of unique emails sent
- **Delivery Rate**: Percentage successfully delivered
- **Open Rate**: Percentage of delivered emails that were opened
- **Click Rate**: Percentage of opened emails with link clicks
- **Bounced/Complained**: Problem emails requiring attention

**Charts & Visualizations:**
- Daily activity trends (sent, delivered, opened, clicked)
- Email type distribution (contact, newsletter, reminders, etc.)
- Event type breakdown
- Recent email events table

## React Email Templates

### Available Templates

1. **BaseEmailTemplate** (`_shared/email-templates/BaseEmailTemplate.tsx`)
   - Reusable foundation with branded header/footer
   - Gradient header with logo
   - Responsive design
   - Consistent styling

2. **ContactConfirmation** (`_shared/email-templates/ContactConfirmation.tsx`)
   - Contact form confirmation
   - Personalized messaging by type (contact/coaching/booking)
   - Call-to-action buttons
   - Dynamic content based on inquiry type

### Creating New Templates

```typescript
import { BaseEmailTemplate } from './BaseEmailTemplate.tsx';
import { Text, Button } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

export const MyNewTemplate = ({ name, customData }) => (
  <BaseEmailTemplate
    previewText="Your preview text"
    heading="Email Heading"
  >
    <Text style={paragraph}>
      Hello {name}, your custom content here.
    </Text>
    
    <Button href="https://forward-focus-elevation.org" style={button}>
      Call to Action
    </Button>
  </BaseEmailTemplate>
);

const paragraph = { color: '#374151', fontSize: '16px' };
const button = { backgroundColor: '#8B5CF6', color: '#fff', padding: '12px 24px' };
```

### Using Templates in Edge Functions

```typescript
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { MyNewTemplate } from '../_shared/email-templates/MyNewTemplate.tsx';

// Render template to HTML
const emailHtml = await renderAsync(
  React.createElement(MyNewTemplate, {
    name: 'John',
    customData: 'value'
  })
);

// Send with Resend
const response = await resend.emails.send({
  from: "Forward Focus Elevation <support@ffeservices.net>",
  to: ["recipient@example.com"],
  subject: "Your Subject",
  html: emailHtml,
});

// Store email ID for tracking
const emailId = response.data?.id;
```

## Database Schema

### email_events Table

Tracks all email events received from Resend webhooks:

```sql
CREATE TABLE email_events (
  id UUID PRIMARY KEY,
  email_id TEXT NOT NULL,          -- Resend email ID
  recipient_email TEXT NOT NULL,    -- Recipient address
  event_type TEXT NOT NULL,         -- delivered, opened, clicked, bounced, complained
  email_type TEXT,                  -- contact, newsletter, reminder, verification
  event_data JSONB,                 -- Additional event metadata
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### contact_submissions Updates

Added tracking fields:
- `resend_email_id`: Links to Resend for tracking
- `email_status`: Current status (pending, sent, delivered, failed)

## Troubleshooting

### Webhook Not Receiving Events

1. Verify webhook URL is correct in Resend dashboard
2. Check that all required events are selected
3. Test with a sample email from contact form
4. Check edge function logs: Admin → Security → Check `resend-webhook` logs

### Email Events Not Showing in Dashboard

1. Ensure admin RLS policies are enabled
2. Verify user has admin role in `user_roles` table
3. Check browser console for errors
4. Refresh the dashboard or change time range

### Low Open/Click Rates

**Common Causes:**
- Email clients blocking tracking pixels
- Recipients have images disabled
- Emails going to spam/promotions folder
- Subject lines not compelling enough

**Solutions:**
- Improve email subject lines and preview text
- Use authenticated sending domain
- Monitor bounce/complaint rates
- A/B test different email content

## Best Practices

### Email Deliverability

1. **Authenticate Your Domain**: Set up SPF, DKIM, and DMARC records in Resend
2. **Monitor Bounce Rates**: Keep bounce rate under 5%
3. **Handle Complaints**: Remove complained addresses immediately
4. **Warm Up Sending**: Gradually increase volume for new domains
5. **Clean List Regularly**: Remove inactive subscribers

### Template Design

1. **Mobile-First**: 60%+ users read on mobile
2. **Clear CTA**: One primary action per email
3. **Branded Consistently**: Use company colors and logo
4. **Accessible**: High contrast, readable fonts, alt text
5. **Test Thoroughly**: Preview in multiple email clients

### Performance Monitoring

1. **Set Benchmarks**: Establish baseline metrics
2. **Track Trends**: Monitor daily/weekly changes
3. **Segment Analysis**: Compare performance by email type
4. **Act on Insights**: Iterate based on data
5. **A/B Testing**: Test subject lines, content, timing

## Security Considerations

- Email events are admin-only (RLS policies enforced)
- Webhook endpoint is public but validates Resend signatures
- Email content should not contain sensitive data
- Contact information masked by default in admin UI
- Rate limiting prevents abuse of contact forms

## Support

For issues or questions:
- Check edge function logs in Admin Dashboard
- Review Resend dashboard for delivery issues
- Contact: support@ffeservices.net
