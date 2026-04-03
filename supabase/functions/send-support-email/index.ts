import { serve } from "@std/http/server";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  type: 'speaker_application' | 'grant_inquiry' | 'ai_consultation' | 'corporate_training';
  data: Record<string, any>;
  csrfToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, csrfToken }: SupportEmailRequest = await req.json();

    // Basic CSRF validation
    if (!csrfToken || csrfToken.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid security token" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate email content based on type
    let subject = "";
    let htmlContent = "";
    let adminNotification = "";

    switch (type) {
      case 'speaker_application':
        subject = `New Speaker Application - ${data.name}`;
        htmlContent = generateSpeakerApplicationEmail(data);
        adminNotification = generateSpeakerAdminNotification(data);
        break;
      case 'grant_inquiry':
        subject = `Grant Funding Inquiry - ${data.organization_name}`;
        htmlContent = generateGrantInquiryEmail(data);
        adminNotification = generateGrantAdminNotification(data);
        break;
      case 'ai_consultation':
        subject = `AI Consultation Request - ${data.organization_name}`;
        htmlContent = generateConsultationEmail(data);
        adminNotification = generateConsultationAdminNotification(data);
        break;
      case 'corporate_training':
        subject = `Corporate Training Request - ${data.company_name}`;
        htmlContent = generateTrainingEmail(data);
        adminNotification = generateTrainingAdminNotification(data);
        break;
      default:
        throw new Error("Invalid request type");
    }

    // Send confirmation email to user
    const userEmailResponse = await resend.emails.send({
      from: "Forward Focus Elevation <noreply@ffeservices.net>",
      to: [data.email],
      subject: `Thank you for your ${getTypeDisplayName(type)}`,
      html: htmlContent,
    });

    console.log("User confirmation email sent successfully:", userEmailResponse);

    // Send admin notification
    const adminEmailResponse = await resend.emails.send({
      from: "Forward Focus Elevation <noreply@ffeservices.net>",
      to: ["support@ffeservices.net"],
      subject: subject,
      html: adminNotification,
    });

    console.log("Admin notification email sent successfully:", adminEmailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getTypeDisplayName(type: string): string {
  const displayNames = {
    'speaker_application': 'Speaker Application',
    'grant_inquiry': 'Grant Inquiry',
    'ai_consultation': 'AI Consultation Request',
    'corporate_training': 'Corporate Training Request'
  };
  return displayNames[type] || 'submission';
}

function generateSpeakerApplicationEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #BB0000, #8B0000); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Application Received!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your interest in sharing your expertise</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #BB0000; margin-top: 0;">Hi ${data.name},</h2>
        <p>Thank you for submitting your speaker application to join Forward Focus Elevation's expert network.</p>
        <p>We're excited about the possibility of having you share your expertise in <strong>${data.expertise?.join(', ')}</strong> with our justice-impacted community.</p>
        <p>Your application is being reviewed, and we'll get back to you within 5-7 business days with next steps.</p>
      </div>
      
      <div style="background: #fff; border: 2px solid #BB0000; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #BB0000; margin-top: 0;">What Happens Next?</h3>
        <ul style="color: #333; line-height: 1.6;">
          <li>Our team will review your application and expertise areas</li>
          <li>We may reach out for a brief phone or video interview</li>
          <li>If approved, we'll add you to our speaker bureau</li>
          <li>You'll receive speaking opportunities that match your availability</li>
        </ul>
      </div>
      
      <p style="color: #666;">If you have any questions, feel free to reply to this email or contact us at support@ffeservices.net</p>
      
      <div style="text-align: center; padding: 20px; border-top: 1px solid #ddd; color: #999; margin-top: 30px;">
        <p><strong>Forward Focus Elevation</strong><br>
        Transforming lives through AI-powered digital education</p>
      </div>
    </div>
  `;
}

function generateSpeakerAdminNotification(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #BB0000;">New Speaker Application</h1>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2>Applicant Information</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
        <p><strong>Organization:</strong> ${data.organization || 'Not provided'}</p>
        <p><strong>Title:</strong> ${data.title || 'Not provided'}</p>
      </div>
      
      <div style="background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Expertise Areas</h3>
        <p>${data.expertise?.join(', ') || 'None specified'}</p>
        
        <h3>Proposed Topics</h3>
        <p>${data.topics || 'Not provided'}</p>
        
        <h3>Presentation Type</h3>
        <p>${data.presentation_type || 'Not specified'}</p>
        
        <h3>Professional Bio</h3>
        <p>${data.bio || 'Not provided'}</p>
        
        <h3>Previous Speaking Experience</h3>
        <p>${data.previous_speaking || 'Not provided'}</p>
        
        <h3>LinkedIn Profile</h3>
        <p>${data.linkedin || 'Not provided'}</p>
        
        <h3>Availability</h3>
        <p>${data.availability || 'Not provided'}</p>
        
        <h3>Technical Requirements</h3>
        <p>${data.tech_requirements || 'None specified'}</p>
      </div>
      
      <p style="background: #fffacd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffd700;">
        <strong>Action Required:</strong> Review application and follow up within 5-7 business days.
      </p>
    </div>
  `;
}

function generateGrantInquiryEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #BB0000, #8B0000); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Inquiry Received!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your interest in funding our mission</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #BB0000; margin-top: 0;">Hi ${data.contact_name},</h2>
        <p>Thank you for your grant funding inquiry on behalf of <strong>${data.organization_name}</strong>.</p>
        <p>We're thrilled about the possibility of partnering with you to expand our AI-powered digital education platform and serve more justice-impacted families.</p>
        <p>Our team will review your inquiry and prepare detailed program information tailored to your foundation's interests.</p>
      </div>
      
      <div style="background: #fff; border: 2px solid #BB0000; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #BB0000; margin-top: 0;">What We'll Send You</h3>
        <ul style="color: #333; line-height: 1.6;">
          <li>Detailed program overview and impact metrics</li>
          <li>Current funding opportunities and needs</li>
          <li>Partnership options and collaboration possibilities</li>
          <li>Success stories and outcomes data</li>
        </ul>
      </div>
      
      <p>We'll get back to you within 3-5 business days with comprehensive information about our programs and how they align with your foundation's mission.</p>
      
      <div style="text-align: center; padding: 20px; border-top: 1px solid #ddd; color: #999; margin-top: 30px;">
        <p><strong>Forward Focus Elevation</strong><br>
        Creating systemic change through innovative technology</p>
      </div>
    </div>
  `;
}

function generateGrantAdminNotification(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #BB0000;">New Grant Funding Inquiry</h1>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2>Foundation Information</h2>
        <p><strong>Organization:</strong> ${data.organization_name}</p>
        <p><strong>Contact:</strong> ${data.contact_name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
        <p><strong>Website:</strong> ${data.website || 'Not provided'}</p>
        <p><strong>Type:</strong> ${data.organization_type || 'Not specified'}</p>
      </div>
      
      <div style="background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Grant Details</h3>
        <p><strong>Focus Areas:</strong> ${data.focus_areas?.join(', ') || 'None specified'}</p>
        <p><strong>Grant Range:</strong> ${data.grant_range || 'Not specified'}</p>
        <p><strong>Timeline:</strong> ${data.timeline || 'Not specified'}</p>
        <p><strong>Geographic Scope:</strong> ${data.geographic_scope || 'Not specified'}</p>
        
        <h3>Program Interest</h3>
        <p>${data.program_focus || 'Not provided'}</p>
        
        <h3>Impact Requirements</h3>
        <p>${data.impact_measurement || 'Not provided'}</p>
        
        <h3>Previous Grants</h3>
        <p>${data.previous_grants || 'Not provided'}</p>
        
        <h3>Partnership Interest</h3>
        <p>${data.partnership_interest || 'Not provided'}</p>
        
        <h3>Additional Info</h3>
        <p>${data.additional_info || 'None provided'}</p>
      </div>
      
      <p style="background: #e6f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #0066cc;">
        <strong>Priority Follow-up:</strong> Prepare grant proposal materials and respond within 3-5 business days.
      </p>
    </div>
  `;
}

function generateConsultationEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #BB0000, #8B0000); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Request Received!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your AI consultation interest</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #BB0000; margin-top: 0;">Hi ${data.contact_name},</h2>
        <p>Thank you for your AI consultation request on behalf of <strong>${data.organization_name}</strong>.</p>
        <p>We're excited about the opportunity to help you implement AI solutions that advance your mission while supporting our work with justice-impacted communities.</p>
        <p>Our technical team will review your requirements and prepare a custom approach for your needs.</p>
      </div>
      
      <div style="background: #fff; border: 2px solid #BB0000; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #BB0000; margin-top: 0;">Next Steps</h3>
        <ul style="color: #333; line-height: 1.6;">
          <li>Technical review of your requirements</li>
          <li>Discovery call to discuss your goals</li>
          <li>Custom proposal with timeline and pricing</li>
          <li>Implementation roadmap and support plan</li>
        </ul>
      </div>
      
      <p>We'll schedule a discovery call within 2-3 business days to better understand your needs and discuss how we can help.</p>
      
      <div style="text-align: center; padding: 20px; border-top: 1px solid #ddd; color: #999; margin-top: 30px;">
        <p><strong>Forward Focus Elevation</strong><br>
        AI solutions that create positive social impact</p>
      </div>
    </div>
  `;
}

function generateConsultationAdminNotification(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #BB0000;">New AI Consultation Request</h1>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2>Organization Information</h2>
        <p><strong>Organization:</strong> ${data.organization_name}</p>
        <p><strong>Contact:</strong> ${data.contact_name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
        <p><strong>Type:</strong> ${data.organization_type || 'Not specified'}</p>
      </div>
      
      <div style="background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Project Details</h3>
        <p><strong>Current Services:</strong> ${data.current_services || 'Not provided'}</p>
        <p><strong>Target Population:</strong> ${data.target_population || 'Not provided'}</p>
        <p><strong>AI Services Interest:</strong> ${data.ai_interest?.join(', ') || 'None specified'}</p>
        <p><strong>Timeline:</strong> ${data.timeline || 'Not specified'}</p>
        <p><strong>Budget Range:</strong> ${data.budget_range || 'Not specified'}</p>
        <p><strong>Partnership Type:</strong> ${data.partnership_type || 'Not specified'}</p>
        
        <h3>Current Challenges</h3>
        <p>${data.current_challenges || 'Not provided'}</p>
        
        <h3>Desired Outcomes</h3>
        <p>${data.desired_outcomes || 'Not provided'}</p>
        
        <h3>Technical Capacity</h3>
        <p>${data.technical_capacity || 'Not provided'}</p>
        
        <h3>Additional Info</h3>
        <p>${data.additional_info || 'None provided'}</p>
      </div>
      
      <p style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
        <strong>Revenue Opportunity:</strong> Schedule discovery call within 2-3 business days. Budget: ${data.budget_range || 'TBD'}
      </p>
    </div>
  `;
}

function generateTrainingEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #BB0000, #8B0000); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Request Received!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your training interest</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #BB0000; margin-top: 0;">Hi ${data.contact_name},</h2>
        <p>Thank you for your corporate AI training request for <strong>${data.company_name}</strong>.</p>
        <p>We're excited to help your team develop AI skills while supporting our mission to serve justice-impacted communities through education.</p>
        <p>Our training programs are designed to deliver practical AI knowledge while creating positive social impact.</p>
      </div>
      
      <div style="background: #fff; border: 2px solid #BB0000; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #BB0000; margin-top: 0;">What's Next</h3>
        <ul style="color: #333; line-height: 1.6;">
          <li>Custom training proposal based on your needs</li>
          <li>Curriculum tailored to your industry and goals</li>
          <li>Flexible delivery options (in-person, virtual, hybrid)</li>
          <li>Social impact report showing community benefit</li>
        </ul>
      </div>
      
      <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
        <p style="margin: 0; color: #155724;"><strong>Social Impact:</strong> Your training investment directly funds scholarships and programs for justice-impacted individuals learning AI and digital skills.</p>
      </div>
      
      <p>We'll create a custom proposal and get back to you within 2-3 business days.</p>
      
      <div style="text-align: center; padding: 20px; border-top: 1px solid #ddd; color: #999; margin-top: 30px;">
        <p><strong>Forward Focus Elevation</strong><br>
        Corporate training that creates positive change</p>
      </div>
    </div>
  `;
}

function generateTrainingAdminNotification(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #BB0000;">New Corporate Training Request</h1>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2>Company Information</h2>
        <p><strong>Company:</strong> ${data.company_name}</p>
        <p><strong>Contact:</strong> ${data.contact_name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
        <p><strong>Industry:</strong> ${data.industry || 'Not specified'}</p>
        <p><strong>Company Size:</strong> ${data.company_size || 'Not specified'}</p>
      </div>
      
      <div style="background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Training Requirements</h3>
        <p><strong>Topics:</strong> ${data.training_topics?.join(', ') || 'None specified'}</p>
        <p><strong>Format:</strong> ${data.delivery_format || 'Not specified'}</p>
        <p><strong>Audience Level:</strong> ${data.audience_level || 'Not specified'}</p>
        <p><strong>Participants:</strong> ${data.participant_count || 'Not specified'}</p>
        <p><strong>Timeline:</strong> ${data.timeline || 'Not specified'}</p>
        <p><strong>Budget:</strong> ${data.budget_range || 'Not specified'}</p>
        <p><strong>Location:</strong> ${data.location_preference || 'Not provided'}</p>
        
        <h3>Current AI Usage</h3>
        <p>${data.current_ai_usage || 'Not provided'}</p>
        
        <h3>Training Goals</h3>
        <p>${data.training_goals || 'Not provided'}</p>
        
        <h3>Success Metrics</h3>
        <p>${data.success_metrics || 'Not provided'}</p>
        
        <h3>Previous Training</h3>
        <p>${data.previous_training || 'Not provided'}</p>
        
        <h3>Additional Info</h3>
        <p>${data.additional_info || 'None provided'}</p>
      </div>
      
      <p style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
        <strong>Revenue Opportunity:</strong> Create custom proposal within 2-3 business days. Potential value: ${data.budget_range || 'TBD'}
      </p>
    </div>
  `;
}

serve(handler);
