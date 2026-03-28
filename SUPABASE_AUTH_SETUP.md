# Supabase Auth Configuration

## Enable Leaked Password Protection

To enable leaked password protection in your Supabase project:

### Steps:

1. **Open Supabase Project Dashboard**
   - Click "View Backend" in your Forward Focus project
   - Navigate to Authentication → Settings

2. **Locate Security Settings**
   - Scroll to the "Security and Protection" section
   - Find "Password Protection" settings

3. **Enable Leaked Password Protection**
   - Toggle ON: "Check passwords against leaked databases"
   - This setting checks user passwords against known breached password databases (e.g., Have I Been Pwned)
   
4. **Configure Strictness** (Optional)
   - **Strict Mode**: Prevents signup/password reset with any leaked password
   - **Warning Mode**: Allows signup but warns users (recommended for Phase 1)

### What This Does:

✅ **Protects users** from using passwords that have appeared in data breaches
✅ **Increases account security** without user friction
✅ **Industry best practice** - recommended by security experts

### Tradeoffs:

⚠️ **User Experience**: Some users may need to choose different passwords
⚠️ **False Positives**: Common passwords might be flagged even if user's account wasn't breached
✅ **Security Benefit**: Significantly reduces risk of credential stuffing attacks

### Recommended Setting:

- **Enable in Warning Mode first** (Phase 1)
- **Monitor user feedback** for 1-2 weeks
- **Switch to Strict Mode** if no issues (Phase 2)

---

## Additional Security Settings to Review:

### 1. Email Confirmations
- **Status**: Auto-confirm is currently ENABLED (for development)
- **Action for Launch**: Disable auto-confirm and require email verification

### 2. Rate Limiting
- **Status**: Built into Supabase Auth by default
- **Current Limits**: 
  - Login attempts: 5 per hour per IP
  - Signup attempts: 3 per hour per IP
- **Action**: Review and adjust if needed based on traffic patterns

### 3. Session Security
- **JWT Expiry**: Default 1 hour (good default)
- **Refresh Token Rotation**: Enabled by default
- **Action**: No changes needed

---

Last Updated: 2025-11-26
