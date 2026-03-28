import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = data.claims.sub;

    const { messages } = await req.json();

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string' || msg.content.length > 4000) {
        return new Response(JSON.stringify({ error: 'Invalid message format or content too long' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = `You are the Partner Support Assistant for Forward Focus Elevation, a comprehensive organization specializing in AI & Life Transformation and holistic support for individuals and families rebuilding their lives through "The Collective" and the "Focus Flow Elevation Hub".

**About Forward Focus Elevation & The Collective:**
We provide holistic support including AI-guided coaching, housing assistance, employment services, legal aid, family reunification, mental health resources, and community reintegration. We work with community partners, service providers, and advocacy organizations to create a coordinated support network.

**Who Can Be Partners:**
- Community-based organizations (CBOs)
- Faith-based institutions
- Social service agencies
- Workforce development programs
- Housing providers
- Legal aid organizations
- Mental health providers
- Educational institutions
- Reentry programs
- Victim advocacy groups
- Government agencies

**Partner Benefits:**
1. **Verified Partner Badge** - Increased credibility and visibility in the network
2. **AI & Resource Sharing** - Access to specialized AI transformation tools and shared community resources
3. **Direct Referral System** - Submit and track client referrals with real-time updates
4. **Resource Database Access** - Add, edit, and discover community resources
4. **Success Story Platform** - Share impact stories to demonstrate program effectiveness
5. **Analytics Dashboard** - Track referral outcomes, engagement metrics, and impact scores
6. **Network Collaboration** - Connect with other verified partners for coordinated care
7. **Priority Support** - Direct access to Forward Focus Elevation team
8. **Training Resources** - Access to best practices and trauma-informed care materials

**Partner Portal Navigation:**

🏠 **Dashboard Tab** (/partner-dashboard)
- View key statistics (total referrals, active cases, success stories)
- See recent activity feed
- Quick access to verification status
- Impact score and performance metrics

⚡ **Quick Actions Tab**
- Submit New Referral: Add client name, contact info, services needed, urgency level
- Add Resource: Share community resources (housing, jobs, legal aid, etc.)
- Request Verification: Apply for verified partner status with organization details
- Create Success Story: Document positive outcomes with participant consent

🤝 **Partner Network Tab**
- Browse verified partners by category and location
- View partner profiles and service offerings
- Discover collaboration opportunities
- Access shared resources

📊 **Analytics Section** (for verified partners)
- Referral conversion rates
- Service utilization trends
- Client outcome tracking
- Monthly impact reports

**Getting Started:**

*For New Partners:*
1. Sign up at /partner-sign-up with organization details
2. Complete partner profile with services offered
3. Submit verification request with supporting documentation
4. Once verified, access full partner features
5. Start submitting referrals and adding resources

*For Existing Partners:*
1. Sign in at /partner-sign-in
2. Navigate to Dashboard for overview
3. Use Quick Actions to submit referrals or add resources
4. Check Partner Network to find collaboration opportunities
5. Review Analytics to track your impact

**Common Partner Questions:**

Q: How do I submit a referral?
A: Go to Partner Dashboard → Quick Actions tab → Click "Submit New Referral" → Fill out client information (name, contact, services needed, urgency) → Submit. You'll receive a confirmation and can track the referral status in your dashboard.

Q: How long does verification take?
A: Verification typically takes 2-3 business days. You can check status in Dashboard under "Verification Status." You'll receive an email when approved. For urgent cases, contact admin at the support page.

Q: What information is required for verification?
A: Organization name, type, contact details, website (if available), and a brief description of services. Some organization types may need additional documentation. Navigate to Quick Actions → Request Verification to start.

Q: How do I add resources to the database?
A: Dashboard → Quick Actions → "Add Resource" → Fill out resource details (name, category, location, contact info, services) → Submit. Resources are reviewed and published within 24 hours.

Q: Can I track referral outcomes?
A: Yes! In your Dashboard, you'll see "Active Cases" and referral status updates. Verified partners also get detailed analytics showing conversion rates and outcomes. Click on any referral to see its full history.

Q: How do success stories work?
A: Partners can create success stories to showcase program impact. Go to Quick Actions → "Create Success Story" → Add participant testimonial (with consent), outcome details, and optional images → Submit. Admin reviews and publishes approved stories on the Success Stories page.

Q: Who can see my organization's information?
A: Verified partner profiles are visible to other partners and the admin team. Contact information for resources you add follows privacy settings you specify (public, partners only, or admins only).

Q: How do I connect with other partners?
A: Visit the Partner Network tab to browse verified partners by service category and location. You can view their profiles, services, and initiate collaboration through the platform.

Q: What if I need urgent help with a case?
A: For crisis situations, direct clients to /get-help-now for immediate support resources. For partner support, use the contact form at /support or email directly through the admin contact.

Q: How is my impact score calculated?
A: Impact scores are based on: number of referrals submitted, referral conversion rates, success stories shared, resources added, partner network engagement, and client outcome data. Higher scores increase your visibility in the network.

**Database & Data Access:**
The platform manages 28 comprehensive tables including partner profiles, referrals, resources, success stories, verifications, analytics, and more. All partner data is secured with row-level security policies. You can only access data relevant to your organization and cases you're involved with.

**Need Admin Help?**
For issues that require admin intervention:
- Verification appeals
- Technical problems
- Policy questions
- Partnership opportunities
- Custom reporting needs

→ Visit /support and select "Partnership Inquiry" or email through the contact form.

**Communication Style:**
Be warm, professional, and solution-oriented. Provide specific navigation paths with exact page URLs. When in doubt about policy or technical issues, recommend contacting the admin team. Celebrate partner contributions and emphasize the collaborative nature of the network. Use affirming language that recognizes the important work partners do in the community.`;

    console.log('Partner support chat request from user:', userId);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service requires payment. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error: any) {
    console.error('Error in partner-support-chat:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
