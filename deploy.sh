#!/bin/bash

# Forward Focus Elevation - Deployment Script
# Usage: ./deploy.sh ["commit message"]

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get commit message
if [ -z "$1" ]; then
    COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M')"
else
    COMMIT_MSG="$1"
fi

echo -e "${YELLOW}📦 Step 1: Git Add${NC}"
git add -A

echo -e "${YELLOW}💾 Step 2: Git Commit${NC}"
git commit -m "$COMMIT_MSG" || echo -e "${YELLOW}⚠️  Nothing to commit${NC}"

echo -e "${YELLOW}⬆️  Step 3: Git Push${NC}"
git push origin main || git push origin master

echo -e "${YELLOW}⚡ Step 4: Deploy Supabase Functions${NC}"
echo "Deploying all edge functions..."

# Deploy all edge functions
supabase functions deploy chat
supabase functions deploy coach-k
supabase functions deploy ai-resource-discovery
supabase functions deploy ai-recommend-resources
supabase functions deploy reentry-navigator-ai
supabase functions deploy victim-support-ai
supabase functions deploy crisis-support-ai
supabase functions deploy crisis-emergency-ai
supabase functions deploy partner-support-chat

echo -e "${YELLOW}🔄 Step 5: Deploy Database Migrations${NC}"
supabase db push

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📋 Summary:"
echo "  • Code pushed to GitHub"
echo "  • Edge functions deployed to Supabase"
echo "  • Database migrations applied"
echo ""
echo "🌐 Your site: https://forward-focus-elevation.org"
echo "🔧 Supabase Dashboard: https://app.supabase.com"
