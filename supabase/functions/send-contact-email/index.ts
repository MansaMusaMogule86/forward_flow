import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { SITE_CONFIG } from '../_shared/site-config.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Brand colors
const OSU_SCARLET = '#BB0000';
const OSU_DARK_RED = '#990000';
const TEXT_DARK = '#2B2B2B';

// Escape HTML entities to prevent injection in admin email body
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// RFC-5322 compatible email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: 'contact' | 'coaching' | 'booking' | 'expungement_application';
}

// Simple HTML email template (no React/JSX)
function getContactConfirmationEmail(name: string, subject: string, type: string): string {
  const getTypeMessage = () => {
    switch (type) {
      case 'coaching':
        return "Coach Kay will personally review your inquiry and respond within 24-48 hours. In the meantime, feel free to explore our learning community and resources.";
      case 'booking':
        return "We'll be in touch within 24 hours to schedule your consultation. Please check your calendar for availability in the coming week.";
      default:
        return "We'll get back to you as soon as possible, typically within 24-48 hours.";
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_CONFIG.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Outfit', Arial, sans-serif; background-color: #F4F4F4; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #D6D6D6; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, ${OSU_SCARLET} 0%, ${OSU_DARK_RED} 100%); padding: 48px 32px; text-align: center; }
    .header-title { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: 0.02em; }
    .header-subtitle { color: rgba(255, 255, 255, 0.85); font-size: 14px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.1em; }
    .content { padding: 40px 32px; position: relative; }
    .greeting { font-size: 24px; font-weight: 700; color: ${TEXT_DARK}; margin: 0 0 24px 0; }
    .text { color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; }
    .message-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 0 0 24px 0; }
    .message-box-text { color: #374151; font-size: 14px; margin: 0 0 8px 0; }
    .message-box-subject { color: #6b7280; font-size: 16px; font-style: italic; margin: 0; }
    .cta-section { background: linear-gradient(135deg, ${OSU_SCARLET} 0%, ${OSU_DARK_RED} 100%); padding: 30px; border-radius: 8px; margin: 24px 0; text-align: center; }
    .cta-text { color: #ffffff; font-size: 16px; margin: 0 0 20px 0; }
    .button { background-color: #ffffff; color: ${OSU_SCARLET}; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 6px; }
    .button-secondary { background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 6px; }
    .footer { background: #FAFAFA; padding: 40px 32px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #E0E0E0; }
    .footer a { color: ${OSU_SCARLET}; text-decoration: none; font-weight: 600; }
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
              <div class="header-subtitle">Empowering Justice-Impacted Families</div>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h2 class="greeting">Hi ${escapeHtml(name)}! 👋</h2>
              <p class="text">Thank you for reaching out to us!</p>
              
              <div class="message-box">
                <p class="message-box-text">We have received your message regarding:</p>
                <p class="message-box-subject">"${escapeHtml(subject)}"</p>
              </div>
              
              <p class="text">${getTypeMessage()}</p>
              
              <div class="cta-section">
                <p class="cta-text">While you wait, explore our community resources:</p>
                <a href="${SITE_CONFIG.baseUrl}/learn" class="button">Learning Community</a>
                <a href="${SITE_CONFIG.baseUrl}/victim-services" class="button-secondary">Healing Hub</a>
              </div>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by client IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(',')[0].trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Rate limiting — fail-closed: deny if DB check cannot be completed
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentRequests, error } = await supabaseClient
        .from("audit_log")
        .select("id")
        .eq("action", "CONTACT_FORM_SUBMIT")
        .eq("ip_address", clientIP)
        .gte("created_at", fiveMinutesAgo);

      if (error) {
        console.error("Rate limit DB error — denying request:", error.message);
        return new Response(
          JSON.stringify({ success: false, error: "Service temporarily unavailable. Please try again shortly." }),
          { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (recentRequests && recentRequests.length >= 5) {
        return new Response(
          JSON.stringify({ success: false, error: "Too many requests. Please wait a few minutes before trying again." }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch (rateLimitError) {
      console.error("Rate limit check exception — denying request:", rateLimitError);
      return new Response(
        JSON.stringify({ success: false, error: "Service temporarily unavailable. Please try again shortly." }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const requestBody: ContactEmailRequest = await req.json();
    const { name, email, subject, message, type } = requestBody;
    
    // SEC4: Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: "Name is required and must be less than 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid email address is required (max 255 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0 || subject.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: "Subject is required and must be less than 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 10000) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required and must be less than 10,000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!type || !['contact', 'coaching', 'booking', 'expungement_application'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Processing email request:", { name, email, subject, type });

    // Generate HTML email (no React needed!)
    const emailHtml = getContactConfirmationEmail(name, subject, type);

    // Send confirmation to user
    const userEmailResponse = await resend.emails.send({
      from: "Forward Focus Elevation <support@ffeservices.net>",
      to: [email],
      subject: "Thank you for reaching out to Forward Focus Elevation",
      html: emailHtml,
    });

    // Store Resend email ID for tracking
    const resendEmailId = userEmailResponse.data?.id;
    
    // Update contact submission with email ID (if table exists)
    if (resendEmailId) {
      try {
        // First check if the table exists to avoid non-critical errors
        const { data: tableExists } = await supabaseClient
          .from("information_schema.tables")
          .select("table_name")
          .eq("table_name", "contact_submissions")
          .eq("table_schema", "public")
          .single();

        if (tableExists) {
          await supabaseClient
            .from("contact_submissions")
            .update({ 
              resend_email_id: resendEmailId,
              email_status: 'sent'
            })
            .eq("email", email)
            .order("created_at", { ascending: false })
            .limit(1);
        }
      } catch (updateError) {
        console.error("Failed to update contact submission with email ID (non-critical):", updateError);
      }
    }

    // Send notification to admin/Coach Kay (all user values HTML-escaped)
    const adminEmailResponse = await resend.emails.send({
      from: "Forward Focus Contact <noreply@ffeservices.net>",
      to: ["support@ffeservices.net"],
      subject: `New ${escapeHtml(type)} inquiry from ${escapeHtml(name)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #374151;">New ${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))} Inquiry</h2>

          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <p><strong>Type:</strong> ${escapeHtml(type)}</p>
          </div>

          <div style="background: white; border: 1px solid #E5E7EB; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Message:</h3>
            <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
          </div>

          <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
            Received at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", { userEmailResponse, adminEmailResponse });

    // Log successful contact form submission (for rate limiting)
    try {
      await supabaseClient
        .from("audit_log")
        .insert({
          action: "CONTACT_FORM_SUBMIT",
          ip_address: clientIP,
          details: { type },
          severity: "info"
        });
    } catch (logError) {
      console.error("Failed to log contact form (non-critical):", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Your message has been sent successfully! We'll get back to you soon."
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
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Failed to send email. Please try again or contact us directly."
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);

