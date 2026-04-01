# Deployment Guide

## Quick Deploy (One Command)

```bash
./deploy.sh "Your commit message"
```

## Manual Step-by-Step

### 1. Git Add
```bash
git add -A
```

### 2. Git Commit
```bash
git commit -m "Your commit message"
```

### 3. Git Push
```bash
git push origin main
```

### 4. Deploy Supabase Functions
```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy ai-resource-discovery
supabase functions deploy coach-k
supabase functions deploy reentry-navigator-ai
supabase functions deploy victim-support-ai
supabase functions deploy crisis-support-ai
supabase functions deploy crisis-emergency-ai
supabase functions deploy ai-recommend-resources
supabase functions deploy partner-support-chat
supabase functions deploy chat
```

### 5. Deploy Database (if migrations changed)
```bash
supabase db push
```

### 6. Deploy to Vercel (if not auto-deployed)
```bash
vercel --prod
```

Or use Vercel GitHub integration for automatic deploys.

---

## First Time Setup

### Make deploy.sh executable
```bash
chmod +x deploy.sh
```

### Login to Supabase CLI
```bash
supabase login
```

### Link your project
```bash
supabase link --project-ref your-project-ref
```

---

## What's Deployed?

| Component | Command | Frequency |
|-----------|---------|-----------|
| Frontend | `git push` (Vercel auto) | Every commit |
| Edge Functions | `supabase functions deploy` | When functions change |
| Database | `supabase db push` | When migrations change |
| Secrets | Supabase Dashboard | Rarely |

---

## Verify Deployment

### Check Functions
```bash
supabase functions list
```

### Check Logs
```bash
# Real-time logs
supabase functions logs ai-resource-discovery --tail
```

### Test Chatbot
1. Visit: https://forward-focus-elevation.org/discover
2. Ask Coach Kay: "Find housing in Columbus"
3. Should respond with resources

---

## Troubleshooting

### "Function not found"
```bash
supabase functions deploy function-name
```

### "OPENROUTER_API_KEY not configured"
Add secret in Supabase Dashboard:
1. Settings → Functions → Secrets
2. Add `OPENROUTER_API_KEY`
3. Redeploy functions

### Database errors
```bash
supabase db reset  # ⚠️ WARNING: Deletes all data!
supabase db push
```

---

## Environment Variables

Make sure these are set in Supabase Secrets:

| Secret | Required For |
|--------|--------------|
| `OPENROUTER_API_KEY` | All AI chatbots |
| `SUPABASE_URL` | All functions |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions |
| `SUPABASE_ANON_KEY` | Auth functions |
| `PERPLEXITY_API_KEY` | Web search fallback |

---

## Production Checklist

Before deploying:
- [ ] Tests pass: `bun test`
- [ ] Build succeeds: `bun run build`
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] Commit message is descriptive

After deploying:
- [ ] Site loads: https://forward-focus-elevation.org
- [ ] Chatbot responds
- [ ] No console errors
- [ ] Database connections work
