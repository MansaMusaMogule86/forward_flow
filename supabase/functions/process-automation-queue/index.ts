import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { SITE_CONFIG } from '../_shared/site-config.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cronSecret = Deno.env.get("CRON_SECRET_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand colors
const OSU_SCARLET = '#BB0000';
const OSU_DARK_RED = '#990000';
const TEXT_DARK = '#2B2B2B';

// Email template functions (plain HTML, no React)
function getWelcomeEmail(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${SITE_CONFIG.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Outfit', Arial, sans-serif; background-color: #F4F4F4; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #D6D6D6; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, ${OSU_SCARLET} 0%, ${OSU_DARK_RED} 100%); padding: 48px 32px; text-align: center; }
    .header-title { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; }
    .content { padding: 40px 32px; }
    .greeting { font-size: 24px; font-weight: 700; color: ${TEXT_DARK}; margin: 0 0 24px 0; }
    .text { color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
    .highlight-box { background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0; }
    .highlight-title { color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 12px 0; }
    .highlight-text { color: #4b5563; font-size: 15px; line-height: 24px; margin: 0; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { background-color: ${OSU_SCARLET}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; }
    .small-text { color: #6b7280; font-size: 14px; margin: 24px 0 0 0; }
    .footer { background: #FAFAFA; padding: 40px 32px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #E0E0E0; }
    @media only screen and (max-width: 600px) {
      .container { margin: 0; width: 100%; border-radius: 0; }
      .content { padding: 32px 20px; }
      .greeting { font-size: 22px; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td class="header">
              <h1 class="header-title">${SITE_CONFIG.name}</h1>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h2 class="greeting">Welcome to Forward Focus Elevation, ${name}!</h2>
              <p class="text">We're thrilled to have you join our community dedicated to empowering justice-impacted families. You've taken an important first step toward growth, healing, and success.</p>
              
              <div class="highlight-box">
                <p class="highlight-title">🎯 What's Next?</p>
                <p class="highlight-text">• Explore our AI-powered learning pathways<br />• Connect with support resources in your area<br />• Join our healing and wellness programs<br />• Engage with a supportive community</p>
              </div>
              
              <p class="text">Our platform is designed with you in mind—combining cutting-edge AI technology with compassionate support to help you navigate your journey with confidence.</p>
              
              <div class="cta-section">
                <a href="${SITE_CONFIG.baseUrl}/learn" class="button">Start Your Journey</a>
              </div>
              
              <p class="small-text">Need help getting started? Reply to this email or visit our Help Center anytime.</p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p style="margin: 0 0 12px 0;"><strong>${SITE_CONFIG.name}</strong> • ${new Date().getFullYear()}</p>
              <p style="margin: 0; color: #9A9A9A; line-height: 1.5;">Empowering Ohio's 88 counties with healing, growth, and second chances.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getMilestoneEmail(name: string, milestoneTitle: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milestone Achieved - ${SITE_CONFIG.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Outfit', Arial, sans-serif; background-color: #F4F4F4; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #D6D6D6; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, ${OSU_SCARLET} 0%, ${OSU_DARK_RED} 100%); padding: 48px 32px; text-align: center; }
    .header-title { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; }
    .content { padding: 40px 32px; }
    .greeting { font-size: 24px; font-weight: 700; color: ${TEXT_DARK}; margin: 0 0 24px 0; }
    .text { color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
    .achievement-box { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border: 2px solid ${OSU_SCARLET}; border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center; }
    .achievement-emoji { font-size: 48px; margin-bottom: 12px; }
    .achievement-title { color: ${OSU_SCARLET}; font-size: 20px; font-weight: bold; margin: 0 0 8px 0; }
    .achievement-text { color: #4b5563; font-size: 16px; margin: 0; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { background-color: ${OSU_SCARLET}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; }
    .footer { background: #FAFAFA; padding: 40px 32px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #E0E0E0; }
    @media only screen and (max-width: 600px) {
      .container { margin: 0; width: 100%; border-radius: 0; }
      .content { padding: 32px 20px; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td class="header">
              <h1 class="header-title">${SITE_CONFIG.name}</h1>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h2 class="greeting">Great work, ${name}!</h2>
              <p class="text">You've reached an important milestone in your journey with us.</p>
              
              <div class="achievement-box">
                <div class="achievement-emoji">🏆</div>
                <p class="achievement-title">${milestoneTitle}</p>
                <p class="achievement-text">Completed</p>
              </div>
              
              <p class="text">Keep up the momentum! Every step forward is progress toward your goals. What's next on your learning path?</p>
              
              <div class="cta-section">
                <a href="${SITE_CONFIG.baseUrl}/learn" class="button">Continue Learning</a>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p style="margin: 0 0 12px 0;"><strong>${SITE_CONFIG.name}</strong> • ${new Date().getFullYear()}</p>
              <p style="margin: 0; color: #9A9A9A; line-height: 1.5;">Celebrating your success every step of the way.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getInactivityEmail(name: string, daysInactive: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Miss You - ${SITE_CONFIG.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Outfit', Arial, sans-serif; background-color: #F4F4F4; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #D6D6D6; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, ${OSU_SCARLET} 0%, ${OSU_DARK_RED} 100%); padding: 48px 32px; text-align: center; }
    .header-title { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; }
    .content { padding: 40px 32px; }
    .greeting { font-size: 24px; font-weight: 700; color: ${TEXT_DARK}; margin: 0 0 24px 0; }
    .text { color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
    .reminder-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 4px; }
    .reminder-title { color: #92400e; font-size: 16px; font-weight: bold; margin: 0 0 8px 0; }
    .reminder-text { color: #a16207; font-size: 14px; margin: 0; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { background-color: ${OSU_SCARLET}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; }
    .footer { background: #FAFAFA; padding: 40px 32px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #E0E0E0; }
    @media only screen and (max-width: 600px) {
      .container { margin: 0; width: 100%; border-radius: 0; }
      .content { padding: 32px 20px; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td class="header">
              <h1 class="header-title">${SITE_CONFIG.name}</h1>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h2 class="greeting">We miss you, ${name}!</h2>
              <p class="text">It's been ${daysInactive} days since you last visited Forward Focus Elevation. Your journey matters to us, and we're here to support you every step of the way.</p>
              
              <div class="reminder-box">
                <p class="reminder-title">🌟 Don't forget why you started</p>
                <p class="reminder-text">Every small step counts. Whether it's exploring a new resource or connecting with our community, we're here to help you move forward.</p>
              </div>
              
              <p class="text">Ready to pick up where you left off? Your personalized dashboard is waiting for you.</p>
              
              <div class="cta-section">
                <a href="${SITE_CONFIG.baseUrl}/learn" class="button">Return to Learning</a>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p style="margin: 0 0 12px 0;"><strong>${SITE_CONFIG.name}</strong> • ${new Date().getFullYear()}</p>
              <p style="margin: 0; color: #9A9A9A; line-height: 1.5;">Here whenever you're ready to continue.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Processing automation queue:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("Unauthorized: Invalid cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Process pending queue items
    const { data: queueItems, error: queueError } = await supabase
      .from('email_automation_queue')
      .select(`
        *,
        email_automation_rules (
          rule_name,
          email_subject,
          email_type
        ),
        profiles (
          email,
          full_name
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50);

    if (queueError) throw queueError;

    console.log(`Found ${queueItems?.length || 0} emails to send`);

    // Process each email
    for (const item of queueItems || []) {
      try {
        const rule = item.email_automation_rules;
        const profile = item.profiles;
        const triggerData = item.trigger_data || {};

        const recipientName = triggerData.name || profile?.full_name || 'there';
        const recipientEmail = triggerData.email || profile?.email;

        if (!recipientEmail) {
          console.error(`No email found for queue item ${item.id}`);
          await supabase
            .from('email_automation_queue')
            .update({ status: 'failed', error_message: 'No recipient email' })
            .eq('id', item.id);
          continue;
        }

        // Generate appropriate template (no React!)
        let emailHtml: string;
        
        switch (rule.email_type) {
          case 'welcome':
            emailHtml = getWelcomeEmail(recipientName);
            break;
            
          case 'milestone':
            emailHtml = getMilestoneEmail(recipientName, triggerData.module_id || 'Learning Module');
            break;
            
          case 'inactivity':
            emailHtml = getInactivityEmail(recipientName, triggerData.days_inactive || 7);
            break;
            
          default:
            console.error(`Unknown email type: ${rule.email_type}`);
            continue;
        }

        // Send email
        const emailResponse = await resend.emails.send({
          from: "Forward Focus Elevation <support@ffeservices.net>",
          to: [recipientEmail],
          subject: rule.email_subject,
          html: emailHtml,
        });

        if (emailResponse.error) {
          throw emailResponse.error;
        }

        // Update queue item as sent
        await supabase
          .from('email_automation_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_email_id: emailResponse.data?.id,
          })
          .eq('id', item.id);

        console.log(`Successfully sent ${rule.email_type} email to ${recipientEmail}`);
      } catch (itemError: any) {
        console.error(`Error processing queue item ${item.id}:`, itemError);
        
        await supabase
          .from('email_automation_queue')
          .update({
            status: 'failed',
            error_message: itemError.message,
          })
          .eq('id', item.id);
      }
    }

    // 2. Check for inactive users (last activity > 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: inactiveUsers, error: inactiveError } = await supabase
      .from('profiles')
      .select('id, email, full_name, updated_at')
      .lt('updated_at', sevenDaysAgo)
      .limit(20);

    if (!inactiveError && inactiveUsers) {
      for (const user of inactiveUsers) {
        // Check if we already sent an inactivity email recently
        const { data: existingQueue } = await supabase
          .from('email_automation_queue')
          .select('id')
          .eq('user_id', user.id)
          .in('status', ['pending', 'sent'])
          .gte('created_at', sevenDaysAgo)
          .limit(1);

        if (!existingQueue || existingQueue.length === 0) {
          // Queue inactivity email
          await supabase.rpc('queue_automation_email', {
            p_user_id: user.id,
            p_rule_name: 'inactivity_7days',
            p_trigger_data: {
              email: user.email,
              name: user.full_name || 'there',
              days_inactive: 7,
            },
          });

          console.log(`Queued inactivity email for user ${user.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: queueItems?.length || 0,
        inactiveChecked: inactiveUsers?.length || 0,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in process-automation-queue:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);

