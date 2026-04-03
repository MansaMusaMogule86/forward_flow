import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Authenticate via cron token
    const cronToken = req.headers.get("x-cron-token");
    const cronSecretToken = Deno.env.get("CRON_SECRET_TOKEN");
    
    if (!cronToken || cronToken !== cronSecretToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Processing email queue...");

    // Get pending and failed emails that haven't exceeded max retries
    const { data: queuedEmails, error: fetchError } = await supabaseClient
      .from('email_send_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      console.log("No emails in queue");
      return new Response(JSON.stringify({ message: "No emails to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Processing ${queuedEmails.length} queued emails`);

    let successCount = 0;
    let failureCount = 0;
    let permanentFailureCount = 0;

    for (const email of queuedEmails) {
      try {
        // Update status to sending
        await supabaseClient
          .from('email_send_queue')
          .update({ status: 'sending', last_attempt_at: new Date().toISOString() })
          .eq('id', email.id);

        // Send email via Resend
        const { data, error } = await resend.emails.send({
          from: "Forward Focus Elevation <support@ffeservices.net>",
          to: [email.recipient_email],
          subject: getSubjectForType(email.email_type),
          html: email.email_content,
        });

        if (error) {
          throw error;
        }

        // Mark as sent
        await supabaseClient
          .from('email_send_queue')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);

        successCount++;
        console.log(`Sent email to ${email.recipient_email}`);

      } catch (error: any) {
        console.error(`Failed to send email to ${email.recipient_email}:`, error);
        
        const newRetryCount = email.retry_count + 1;
        const isPermanentFailure = newRetryCount >= email.max_retries;

        await supabaseClient
          .from('email_send_queue')
          .update({ 
            status: isPermanentFailure ? 'permanently_failed' : 'failed',
            retry_count: newRetryCount,
            error_message: error.message,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', email.id);

        if (isPermanentFailure) {
          permanentFailureCount++;
          
          // Create security alert for permanent failures
          await supabaseClient
            .from('security_alerts')
            .insert({
              alert_type: 'email_delivery_failure',
              severity: 'medium',
              description: `Failed to send email to ${email.recipient_email} after ${newRetryCount} attempts`,
              alert_data: {
                email_id: email.id,
                email_type: email.email_type,
                recipient: email.recipient_email,
                error: error.message
              }
            });
        } else {
          failureCount++;
        }
      }

      // Rate limiting: 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Queue processing completed: ${successCount} sent, ${failureCount} failed (will retry), ${permanentFailureCount} permanently failed`);

    return new Response(JSON.stringify({ 
      message: "Queue processed",
      sent: successCount,
      failed: failureCount,
      permanent_failures: permanentFailureCount
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in process-email-queue:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

function getSubjectForType(emailType: string): string {
  switch(emailType) {
    case 'site_usage':
      return "📚 This Week's Resources & Tools - Forward Focus Elevation";
    case 'booking_coaching':
      return "💫 Focus Flow Elevation Hub: Your Community Awaits";
    case 'weekly_engagement':
      return "🌟 Week in Review + What's Coming";
    case 'community_call':
      return "🎙️ Tonight at 6 PM: Weekly Community Call";
    case 'welcome_email':
      return "Welcome to the Forward Focus Elevation Collective! 🌟";
    default:
      return "Forward Focus Elevation Update";
  }
}

