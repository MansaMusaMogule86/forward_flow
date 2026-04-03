import { serve } from "@std/http/server";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResourceEmailRequest {
  organization: string;
  resourceName: string;
  category: string;
  website?: string;
  phone?: string;
  description: string;
  partnerEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization, resourceName, category, website, phone, description, partnerEmail }: ResourceEmailRequest = await req.json();

    console.log("Processing resource submission notification:", { organization, resourceName, partnerEmail });

    // Send notification to support team
    const adminEmailResponse = await resend.emails.send({
      from: "Resource Submissions <noreply@ffeservices.net>",
      to: ["support@ffeservices.net"],
      subject: `New Resource Submitted: ${resourceName} by ${organization}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #374151;">New Resource Submission</h2>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Organization:</strong> ${organization}</p>
            <p><strong>Resource Name:</strong> ${resourceName}</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Website:</strong> ${website || 'N/A'}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p><strong>Submitted by:</strong> ${partnerEmail}</p>
          </div>
          <div style="background: white; border: 1px solid #E5E7EB; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Description:</h3>
            <p style="white-space: pre-wrap;">${description}</p>
          </div>
          <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
            Received at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    // Send confirmation to partner
    const partnerEmailResponse = await resend.emails.send({
      from: "Forward Focus Elevation <support@ffeservices.net>",
      to: [partnerEmail],
      subject: "Resource Submission Received - Forward Focus Elevation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #BB0000, #666666); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Forward Focus Elevation</h1>
          </div>
          <h2 style="color: #374151;">Thank you for contributing!</h2>
          <p>We've received your submission for the resource: <strong>${resourceName}</strong>.</p>
          <p>Our team will review the information and publish it to our community directory shortly. We may contact you if we need any further details.</p>
          <p>Best regards,<br>The Forward Focus Elevation Team</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-resource-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

