import { serve } from "@std/http/server";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReferralNotificationRequest {
  referralId: string;
  name: string;
  contactInfo: string;
  notes: string;
  partnerEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referralId, name, contactInfo, notes, partnerEmail }: ReferralNotificationRequest = await req.json();

    // Send confirmation email to partner
    if (partnerEmail) {
      await resend.emails.send({
        from: "Forward Focus <notifications@forwardfocus.org>",
        to: [partnerEmail],
        subject: "Referral Submitted Successfully",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #b71c1c;">Referral Confirmation</h2>
            <p>Thank you for submitting a referral to Forward Focus Elevation.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Referral Details:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Contact:</strong> ${contactInfo}</p>
              <p><strong>Notes:</strong> ${notes}</p>
              <p><strong>Reference ID:</strong> ${referralId}</p>
            </div>
            
            <p>Our team will reach out to the individual within 24-48 hours to begin providing support.</p>
            <p>You can track the status of this referral in your partner portal.</p>
            
            <p>Best regards,<br>Forward Focus Elevation Team</p>
          </div>
        `,
      });
    }

    // Send notification to admin team
    await resend.emails.send({
      from: "Forward Focus <notifications@ffeservices.net>",
      to: ["support@ffeservices.net"], // Standardized domain
      subject: "New Referral Received",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #b71c1c;">New Referral Alert</h2>
          <p>A new referral has been submitted by a partner.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Referral Details:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Contact:</strong> ${contactInfo}</p>
            <p><strong>Notes:</strong> ${notes}</p>
            <p><strong>Reference ID:</strong> ${referralId}</p>
            <p><strong>Submitted by:</strong> ${partnerEmail || 'Partner'}</p>
          </div>
          
          <p><strong>Action Required:</strong> Please follow up with this individual within 24-48 hours.</p>
          
          <p>Access the admin portal to assign this referral and track progress.</p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending referral notifications:", error);
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
