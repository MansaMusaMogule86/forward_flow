import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from 'https://esm.sh/react@18.3.1';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import { ContactConfirmation } from '../_shared/email-templates/ContactConfirmation.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

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
  type: 'contact' | 'coaching' | 'booking';
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
        .from("audit_logs")
        .select("id")
        .eq("action", "CONTACT_FORM_SUBMIT")
        .eq("ip_address", clientIP)
        .gte("created_at", fiveMinutesAgo);

      if (error) {
        // Fail-closed: cannot verify rate limit, deny request
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
      // Fail-closed: unknown error, deny request
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
    
    if (!type || !['contact', 'coaching', 'booking'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Processing email request:", { name, email, subject, type });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Render React Email template
    const emailHtml = await renderAsync(
      React.createElement(ContactConfirmation, {
        name,
        subject,
        type,
      })
    );

    // Send confirmation to user
    const userEmailResponse = await resend.emails.send({
      from: "Forward Focus Elevation <support@ffeservices.net>",
      to: [email],
      subject: "Thank you for reaching out to Forward Focus Elevation",
      html: emailHtml,
    });

    // Store Resend email ID for tracking
    const resendEmailId = userEmailResponse.data?.id;
    
    // Update contact submission with email ID
    if (resendEmailId) {
      try {
        await supabaseClient
          .from("contact_submissions")
          .update({ 
            resend_email_id: resendEmailId,
            email_status: 'sent'
          })
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1);
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
      // Do not store PII (email/subject) in audit log — used only for rate limiting
      await supabaseClient
        .from("audit_logs")
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
