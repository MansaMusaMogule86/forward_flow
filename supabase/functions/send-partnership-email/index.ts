import { serve } from "@std/http/server";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PartnershipEmailRequest {
  name: string;
  email: string;
  partnershipType: string;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received partnership email request:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, partnershipType, description }: PartnershipEmailRequest = await req.json();
    
    console.log("Processing partnership email request:", { name, email, partnershipType });

    // Send confirmation to partner organization
    const partnerEmailResponse = await resend.emails.send({
      from: "Forward Focus Elevation <support@ffeservices.net>",
      to: [email],
      subject: "Partnership Request Received - Forward Focus Elevation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #BB0000, #666666); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Forward Focus Elevation</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Empowering Justice-Impacted Families</p>
          </div>
          
          <h2 style="color: #374151; margin-bottom: 20px;">Thank you for your partnership interest, ${name}!</h2>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #374151; margin: 0;">We have received your partnership request for:</p>
            <p style="color: #BB0000; margin: 10px 0 0 0; font-weight: bold;">${partnershipType}</p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">
            We're excited about the possibility of partnering with your organization to better serve justice-impacted individuals and families. Our team will review your request and get back to you within 2-3 business days.
          </p>
          
          <div style="background: #F9FAFB; border-left: 4px solid #BB0000; padding: 20px; margin: 20px 0;">
            <h3 style="color: #BB0000; margin: 0 0 15px 0;">Next Steps:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Review of your partnership application</li>
              <li>Background verification process</li>
              <li>Partnership agreement discussion</li>
              <li>Onboarding and integration</li>
            </ul>
          </div>
          
          <div style="background: linear-gradient(135deg, #BB0000, #666666); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <p style="color: white; margin: 0 0 15px 0;">While you wait, explore our current resources:</p>
            <a href="https://forward-focus-elevation.org" style="background: white; color: #BB0000; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">Visit Our Website</a>
            <a href="https://forward-focus-elevation.org/about" style="background: rgba(255,255,255,0.2); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Learn About Us</a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The Forward Focus Elevation Partnership Team<br>
            Email: support@ffeservices.net
          </p>
        </div>
      `,
    });

    // Send notification to support team
    const supportEmailResponse = await resend.emails.send({
      from: "Partnership Requests <noreply@ffeservices.net>",
      to: ["support@ffeservices.net"],
      subject: `New Partnership Request from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #374151;">New Partnership Request</h2>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Organization:</strong> ${name}</p>
            <p><strong>Contact Email:</strong> ${email}</p>
            <p><strong>Partnership Type:</strong> ${partnershipType}</p>
          </div>
          
          <div style="background: white; border: 1px solid #E5E7EB; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Description:</h3>
            <p style="white-space: pre-wrap;">${description}</p>
          </div>
          
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400E; margin: 0;"><strong>Action Required:</strong> Please review and respond within 2-3 business days.</p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
            Received at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    console.log("Partnership emails sent successfully:", { partnerEmailResponse, supportEmailResponse });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Partnership request submitted successfully! Check your email for confirmation."
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
    console.error("Error in send-partnership-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Failed to send partnership request. Please try again or contact us directly."
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
