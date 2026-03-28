# API Key Rotation Guide

## Overview

This document provides step-by-step procedures for rotating API keys used in the application. Regular key rotation is a critical security practice that limits the impact of potential key compromises.

## Rotation Schedule

| Key Name | Rotation Interval | Criticality | Service |
|----------|------------------|-------------|---------|
| OPENAI_API_KEY | 90 days | Critical | AI Chat Features |
| RESEND_API_KEY | 90 days | Critical | Email Delivery |
| STRIPE_SECRET_KEY | 90 days | Critical | Payment Processing |
| PERPLEXITY_API_KEY | 90 days | Standard | AI Search |
| CRON_SECRET_TOKEN | 180 days | Standard | Scheduled Jobs |

## General Rotation Process

### Before Rotation

1. **Schedule during low-traffic periods** - Rotate keys during off-peak hours
2. **Notify team members** - Alert relevant team members before rotation
3. **Verify backup access** - Ensure you have admin access to all services
4. **Test in staging** - If available, test the new key in staging first

### During Rotation

1. Generate new key in the service provider's dashboard
2. Update the secret in Supabase Dashboard Secrets
3. Verify the application works with the new key
4. Monitor logs for any errors

### After Rotation

1. Mark the key as rotated in the Admin Dashboard
2. Revoke or delete the old key from the service provider
3. Document any issues encountered

---

## Service-Specific Rotation Procedures

### OpenAI API Key (OPENAI_API_KEY)

**Location**: [OpenAI Platform](https://platform.openai.com/api-keys)

1. Log in to OpenAI Platform
2. Navigate to API Keys section
3. Click "Create new secret key"
4. Copy the new key immediately (it won't be shown again)
5. Update in Supabase Dashboard Secrets
6. Test by sending a message in any AI chat feature
7. Delete the old key from OpenAI Platform

**Verification**: Send a test message in the Crisis Support AI or Coach Kay chat.

---

### Resend API Key (RESEND_API_KEY)

**Location**: [Resend Dashboard](https://resend.com/api-keys)

1. Log in to Resend Dashboard
2. Go to API Keys section
3. Create a new API key with same permissions
4. Update in Supabase Dashboard Secrets
5. Test by sending a test email from Admin Dashboard
6. Delete the old key from Resend

**Verification**: Use the "Send Test Email" feature in Admin Dashboard.

---

### Stripe Secret Key (STRIPE_SECRET_KEY)

**Location**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

⚠️ **CRITICAL**: Stripe key rotation requires extra care

1. Log in to Stripe Dashboard
2. Navigate to Developers > API Keys
3. Click "Roll key" on the Secret key
4. Stripe will create a new key while keeping the old one active
5. Update in Supabase Dashboard Secrets
6. Test a small donation (use test mode if available)
7. After verification, expire the old key in Stripe

**Verification**: Process a test donation and verify it appears in Stripe Dashboard.

---

### Perplexity API Key (PERPLEXITY_API_KEY)

**Location**: [Perplexity API Settings](https://www.perplexity.ai/settings/api)

1. Log in to Perplexity
2. Go to API Settings
3. Generate a new API key
4. Update in Supabase Dashboard Secrets
5. Test AI resource discovery features
6. Revoke the old key

**Verification**: Test the AI Resource Discovery feature.

---

### CRON Secret Token (CRON_SECRET_TOKEN)

**Location**: Self-generated token

1. Generate a new secure random token:
   ```bash
   openssl rand -base64 32
   ```
2. Update in Supabase Dashboard Secrets
3. Update any cron job configurations that use this token
4. Test scheduled jobs are still working

---

## Emergency Rotation

If you suspect a key has been compromised:

1. **Immediately revoke the compromised key** at the service provider
2. Generate a new key
3. Update in Supabase Dashboard Secrets
4. Monitor logs for suspicious activity
5. Check for unauthorized usage in the service provider's dashboard
6. Document the incident

## Monitoring & Alerts

The Admin Dashboard includes an API Security tab that:
- Shows all tracked API keys
- Displays days until next rotation
- Alerts when keys are overdue for rotation
- Logs all rotation events for audit purposes

## Best Practices

1. **Never share keys** - Each environment should have its own keys
2. **Use least privilege** - Create keys with minimum required permissions
3. **Monitor usage** - Regularly check API usage for anomalies
4. **Document rotations** - Always log when and why keys were rotated
5. **Test thoroughly** - Always verify functionality after rotation
6. **Have a backup plan** - Know how to quickly revert if issues arise

## Troubleshooting

### Key not working after rotation
1. Wait 1-2 minutes for propagation
2. Verify the key was copied correctly (no extra spaces)
3. Check the key has proper permissions
4. Review edge function logs for specific errors

### Service degradation after rotation
1. Immediately roll back to old key if still valid
2. If old key was revoked, generate a new one
3. Check service provider status page
4. Contact support if issues persist

---

## Contact

For urgent key rotation issues, contact the platform administrator immediately.
