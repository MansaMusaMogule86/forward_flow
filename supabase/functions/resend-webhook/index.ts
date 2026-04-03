import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookEvent {
  type: string; // email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
  created_at: string;
  data: {
    email_id: string;
    to: string;
    from: string;
    subject: string;
    click?: {
      link: string;
      timestamp: string;
    };
    bounce?: {
      reason: string;
    };
    complaint?: {
      reason: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Resend webhook received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const webhookPayload: ResendWebhookEvent = await req.json();
    console.log("Webhook payload:", JSON.stringify(webhookPayload, null, 2));

    const { type, created_at, data } = webhookPayload;

    // Map Resend event types to our event types
    const eventTypeMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delayed',
      'email.bounced': 'bounced',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.complained': 'complained',
    };

    const eventType = eventTypeMap[type] || type;

    // Determine email type from subject or other metadata
    let emailType = 'general';
    if (data.subject?.toLowerCase().includes('contact') || data.subject?.toLowerCase().includes('inquiry')) {
      emailType = 'contact';
    } else if (data.subject?.toLowerCase().includes('reminder')) {
      emailType = 'reminder';
    } else if (data.subject?.toLowerCase().includes('verification')) {
      emailType = 'verification';
    }

    // Store event in database
    const { error: insertError } = await supabase
      .from('email_events')
      .insert({
        email_id: data.email_id,
        recipient_email: data.to,
        event_type: eventType,
        email_type: emailType,
        event_data: {
          from: data.from,
          subject: data.subject,
          timestamp: created_at,
          click: data.click,
          bounce: data.bounce,
          complaint: data.complaint,
        },
      });

    if (insertError) {
      console.error("Error inserting email event:", insertError);
      throw insertError;
    }

    // Update contact_submissions status if this is a contact email
    if (emailType === 'contact') {
      const statusMap: Record<string, string> = {
        'sent': 'sent',
        'delivered': 'delivered',
        'bounced': 'failed',
        'complained': 'failed',
      };

      const emailStatus = statusMap[eventType];
      
      if (emailStatus) {
        const { error: updateError } = await supabase
          .from('contact_submissions')
          .update({ email_status: emailStatus })
          .eq('resend_email_id', data.email_id);

        if (updateError) {
          console.error("Error updating contact submission:", updateError);
        }
      }
    }

    console.log(`Successfully tracked ${eventType} event for ${data.email_id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in resend-webhook function:", error);
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

