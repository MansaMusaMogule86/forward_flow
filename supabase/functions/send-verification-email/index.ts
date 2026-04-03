import { serve } from "@std/http/server";
import { Resend } from "resend";
import { getSiteUrl } from "../_shared/site-config.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const partnerDashboardUrl = getSiteUrl("/partner-dashboard");

interface VerificationEmailRequest {
  userEmail: string;
  contactName?: string;
  contactPhone?: string;
  organizationName: string;
  status: string;
  adminNotes?: string;
  verifiedAt?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userEmail, 
      contactName,
      contactPhone,
      organizationName, 
      status, 
      adminNotes,
      verifiedAt 
    }: VerificationEmailRequest = await req.json();

    console.log(`Sending verification email to: ${userEmail}, Status: ${status}`);

    let subject = "";
    let html = "";

    if (status === "approved") {
      subject = "🎉 Congratulations! You're Now a Verified Partner";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #16a34a; font-size: 24px; margin-bottom: 20px;">Welcome to the Verified Partner Network!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Great news! Your organization, <strong>${organizationName}</strong>, has been approved as a verified partner.
          </p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #166534; font-weight: 600;">✓ Verified Partner Status</p>
            <p style="margin: 5px 0 0 0; color: #166534; font-size: 14px;">Verified on: ${verifiedAt ? new Date(verifiedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
          </div>

          <h2 style="color: #1f2937; font-size: 18px; margin-top: 30px;">What's Next?</h2>
          <ul style="line-height: 1.8; color: #374151;">
            <li>Submit referrals for justice-impacted individuals</li>
            <li>Add community resources to our directory</li>
            <li>Access advanced partner analytics</li>
            <li>Get featured in our verified partner directory</li>
          </ul>

          <div style="margin: 30px 0;">
            <a href="${partnerDashboardUrl}"
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Access Your Partner Dashboard
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            If you have any questions, feel free to reach out to our team at 
            <a href="mailto:support@ffeservices.net" style="color: #2563eb;">support@ffeservices.net</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Forward Focus Elevation - Supporting Justice-Impacted Individuals<br>
            <a href="https://forward-focus-elevation.org" style="color: #2563eb;">forward-focus-elevation.org</a>
          </p>
        </div>
      `;
    } else if (status === "rejected") {
      subject = "Partner Verification Update";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Partner Verification Update</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Thank you for your interest in becoming a verified partner with Forward Focus Elevation for <strong>${organizationName}</strong>.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            After careful review, we are unable to approve your verification request at this time.
          </p>

          ${adminNotes ? `
          <div style="background-color: #fef3c7; border-left: 4px solid: #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">Admin Notes:</p>
            <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">${adminNotes}</p>
          </div>
          ` : ''}

          <h2 style="color: #1f2937; font-size: 18px; margin-top: 30px;">What You Can Do:</h2>
          <ul style="line-height: 1.8; color: #374151;">
            <li>Review our <a href="https://forward-focus-elevation.org/partners" style="color: #2563eb;">partner requirements</a></li>
            <li>Ensure your organization meets verification criteria</li>
            <li>Reapply with additional documentation if available</li>
            <li>Contact our support team for guidance</li>
          </ul>

          <div style="margin: 30px 0;">
            <a href="https://forward-focus-elevation.org/partners" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Learn More About Requirements
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Have questions? Contact us at 
            <a href="mailto:support@ffeservices.net" style="color: #2563eb;">support@ffeservices.net</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Forward Focus Elevation - Supporting Justice-Impacted Individuals<br>
            <a href="https://forward-focus-elevation.org" style="color: #2563eb;">forward-focus-elevation.org</a>
          </p>
        </div>
      `;
    } else if (status === "pending") {
      subject = "⏰ Verification Request Under Review";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 20px;">Your Verification is Being Reviewed</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Thank you for submitting your partner verification request for <strong>${organizationName}</strong>.
          </p>
          
          <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">⏰ Status: Under Review</p>
            <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 14px;">Estimated timeline: 3-5 business days</p>
          </div>

          <h2 style="color: #1f2937; font-size: 18px; margin-top: 30px;">What Happens Next:</h2>
          <ul style="line-height: 1.8; color: #374151;">
            <li>Our team will review your application and documentation</li>
            <li>You'll receive an email once a decision is made</li>
            <li>If approved, you'll gain access to verified partner features</li>
            <li>If more information is needed, we'll reach out directly</li>
          </ul>

          <div style="margin: 30px 0;">
            <a href="${partnerDashboardUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Check Application Status
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Questions about your application? Contact us at 
            <a href="mailto:support@ffeservices.net" style="color: #2563eb;">support@ffeservices.net</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Forward Focus Elevation - Supporting Justice-Impacted Individuals<br>
            <a href="https://forward-focus-elevation.org" style="color: #2563eb;">forward-focus-elevation.org</a>
          </p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Forward Focus Elevation <noreply@forward-focus-elevation.org>",
      to: [userEmail],
      subject: subject,
      html: html,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

