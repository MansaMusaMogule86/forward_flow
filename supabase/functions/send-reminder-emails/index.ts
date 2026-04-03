import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};

interface ReminderType {
  type: 'site_usage' | 'booking_coaching' | 'weekly_engagement';
  subject: string;
  daysInactive?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Dual authentication: Admin JWT OR Cron Token
    const cronToken = req.headers.get("x-cron-token");
    const cronSecretToken = Deno.env.get("CRON_SECRET_TOKEN");
    const authHeader = req.headers.get("Authorization");
    
    let isAuthenticated = false;
    let authSource = "";
    let userId: string | null = null;

    // Check cron token first (for automated jobs)
    if (cronToken && cronToken === cronSecretToken) {
      isAuthenticated = true;
      authSource = "cron_automated";
      console.log("✅ Cron-triggered email send authenticated");
    } 
    // Fall back to JWT authentication (for manual dashboard triggers)
    else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (!userError && userData.user) {
        const { data: userRoles } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id);

        const isAdmin = userRoles?.some(role => role.role === 'admin');
        if (isAdmin) {
          isAuthenticated = true;
          authSource = "admin_manual";
          userId = userData.user.id;
          console.log("✅ Admin-triggered email send authenticated");
        }
      }
    }

    if (!isAuthenticated) {
      throw new Error("Authentication required: Provide valid admin JWT or cron token");
    }

    const { reminderType }: { reminderType: ReminderType } = await req.json();

    console.log(`Sending ${reminderType.type} reminders...`);

    // Get active subscribers
    const { data: subscribers, error: subsError } = await supabaseClient
      .from('newsletter_subscriptions')
      .select('email, name')
      .eq('status', 'active');

    if (subsError) throw subsError;

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No subscribers found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailContent = "";
    let subject = "";

    switch (reminderType.type) {
      case 'site_usage':
        subject = "Don't Miss Out! Continue Your Growth Journey 🌱";
        emailContent = generateSiteUsageEmail();
        break;
      case 'booking_coaching':
        subject = "Ready for Your Next Breakthrough? Book a Session with Coach Kay 💫";
        emailContent = generateBookingReminderEmail();
        break;
      case 'weekly_engagement':
        subject = "This Week's Resources & Support - Forward Focus Elevation 📚";
        emailContent = generateWeeklyEngagementEmail();
        break;
      default:
        throw new Error("Invalid reminder type");
    }

    let successCount = 0;
    let failureCount = 0;

    // Send emails in batches
    const batchSize = 10;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (subscriber) => {
        try {
          await resend.emails.send({
            from: "Coach Kay <support@ffeservices.net>",
            to: [subscriber.email],
            subject,
            html: emailContent.replace(/{{name}}/g, subscriber.name || 'Friend'),
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          failureCount++;
        }
      }));

      // Small delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Reminders sent: ${successCount} success, ${failureCount} failures`);

    // Log to audit_log for monitoring
    try {
      await supabaseClient.from('audit_log').insert({
        user_id: userId, // null for cron jobs
        action: `EMAIL_CAMPAIGN_${reminderType.type.toUpperCase()}`,
        resource_type: 'email_campaign',
        details: {
          auth_source: authSource,
          email_type: reminderType.type,
          subject: reminderType.subject || subject,
          recipients_total: subscribers.length,
          sent_count: successCount,
          failed_count: failureCount,
          timestamp: new Date().toISOString()
        },
        severity: failureCount > 0 ? 'warn' : 'info'
      });
    } catch (logError) {
      console.error("Failed to log audit entry:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reminders sent to ${successCount} subscribers`,
        stats: { success: successCount, failures: failureCount },
        auth_source: authSource
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Reminder email error:", error);
    
    // Log error to security_alerts for critical failures
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      await supabaseClient.from('security_alerts').insert({
        alert_type: 'email_campaign_failure',
        severity: 'high',
        description: `Email campaign failed: ${error.message}`,
        metadata: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    } catch (alertError) {
      console.error("Failed to create security alert:", alertError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send reminders" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

function generateSiteUsageEmail(): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #8B5CF6, #06B6D4); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 25px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">We Miss You, {{name}}! 💜</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Your growth journey is waiting</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h2 style="color: #374151; margin-top: 0;">Continue Your Journey</h2>
        <p style="color: #6B7280; line-height: 1.7; font-size: 16px;">
          We haven't seen you in a while! Here's what you're missing:
        </p>
        
        <div style="margin: 25px 0;">
          <div style="padding: 20px; background: #F3F4F6; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0; font-size: 18px;">🎓 New Learning Pathways</h3>
            <p style="color: #6B7280; margin: 0;">Explore our latest courses designed for justice-impacted families</p>
          </div>
          
          <div style="padding: 20px; background: #F3F4F6; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #06B6D4; margin: 0 0 10px 0; font-size: 18px;">🧘‍♀️ Healing Tools</h3>
            <p style="color: #6B7280; margin: 0;">Access guided meditations, breathing exercises, and wellness resources</p>
          </div>
          
          <div style="padding: 20px; background: #F3F4F6; border-radius: 8px;">
            <h3 style="color: #10B981; margin: 0 0 10px 0; font-size: 18px;">🤝 Community Support</h3>
            <p style="color: #6B7280; margin: 0;">Connect with others on similar journeys and share experiences</p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://forward-focus-elevation.org" 
             style="background: linear-gradient(135deg, #8B5CF6, #06B6D4); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
            Return to Your Journey →
          </a>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
        <p>Forward Focus Elevation | Empowering Justice-Impacted Families</p>
        <p><a href="https://forward-focus-elevation.org/unsubscribe?email={{email}}" style="color: #8B5CF6;">Unsubscribe</a></p>
      </div>
    </div>
  `;
}

function generateBookingReminderEmail(): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #8B5CF6, #06B6D4); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 25px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Ready for Your Breakthrough? 💫</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Book a 1-on-1 session with Coach Kay</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h2 style="color: #374151; margin-top: 0;">Hi {{name}},</h2>
        <p style="color: #6B7280; line-height: 1.7; font-size: 16px;">
          You've been making progress on your journey, but sometimes we all need personalized guidance to reach the next level.
        </p>
        
        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B; margin: 25px 0;">
          <p style="margin: 0; color: #92400E; font-weight: 600;">💡 In a coaching session, you'll:</p>
          <ul style="color: #92400E; margin: 10px 0 0 20px; line-height: 1.7;">
            <li>Get personalized strategies for your specific situation</li>
            <li>Overcome obstacles holding you back</li>
            <li>Create an actionable plan for your goals</li>
            <li>Receive accountability and support</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://forward-focus-elevation.org" 
             style="background: linear-gradient(135deg, #8B5CF6, #06B6D4); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
            Book Your Session Now →
          </a>
        </div>
        
        <p style="color: #6B7280; text-align: center; margin-top: 20px; font-size: 14px; font-style: italic;">
          Limited slots available this week
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
        <p>Forward Focus Elevation | Empowering Justice-Impacted Families</p>
        <p><a href="https://forward-focus-elevation.org/unsubscribe?email={{email}}" style="color: #8B5CF6;">Unsubscribe</a></p>
      </div>
    </div>
  `;
}

function generateWeeklyEngagementEmail(): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #8B5CF6, #06B6D4); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 25px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">This Week's Resources 📚</h1>
        <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Your weekly dose of empowerment</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h2 style="color: #374151; margin-top: 0;">Hi {{name}},</h2>
        <p style="color: #6B7280; line-height: 1.7; font-size: 16px;">
          Here's what's new at Forward Focus Elevation this week:
        </p>
        
        <div style="margin: 25px 0;">
          <div style="padding: 20px; background: #F3F4F6; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0; font-size: 18px;">✨ Featured This Week</h3>
            <p style="color: #6B7280; margin: 0;">Explore new success stories from our community and get inspired by real transformation</p>
          </div>
          
          <div style="padding: 20px; background: #F3F4F6; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #06B6D4; margin: 0 0 10px 0; font-size: 18px;">🎯 Quick Wins</h3>
            <p style="color: #6B7280; margin: 0;">Try our 5-minute daily healing exercise - perfect for busy schedules</p>
          </div>
          
          <div style="padding: 20px; background: #F3F4F6; border-radius: 8px;">
            <h3 style="color: #10B981; margin: 0 0 10px 0; font-size: 18px;">💬 Ask Coach Kay</h3>
            <p style="color: #6B7280; margin: 0;">Get AI-powered guidance 24/7 on your most pressing questions</p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://forward-focus-elevation.org" 
             style="background: linear-gradient(135deg, #8B5CF6, #06B6D4); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
            Explore This Week's Resources →
          </a>
        </div>
      </div>
      
      <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #4338CA; font-weight: 600; text-align: center;">💜 Support Our Mission</p>
        <p style="margin: 10px 0 0 0; color: #4338CA; text-align: center; font-size: 14px;">
          Help us reach more families - <a href="https://forward-focus-elevation.org/support" style="color: #8B5CF6;">Donate Today</a>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
        <p>Forward Focus Elevation | Empowering Justice-Impacted Families</p>
        <p><a href="https://forward-focus-elevation.org/unsubscribe?email={{email}}" style="color: #8B5CF6;">Unsubscribe</a></p>
      </div>
    </div>
  `;
}

serve(handler);

