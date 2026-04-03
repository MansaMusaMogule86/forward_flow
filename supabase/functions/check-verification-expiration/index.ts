import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationWithProfile {
  id: string;
  user_id: string;
  organization_name: string;
  status: string;
  expires_at: string;
  renewal_reminder_sent: boolean;
  profiles: {
    email: string;
    full_name: string;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    console.log("Starting verification expiration check...");

    console.log("Fetching expiring and expired verifications...");

    // Find verifications in parallel
    const [
      { data: expiring30Days, error: error30 },
      { data: expiring7Days, error: error7 },
      { data: expired, error: errorExpired }
    ] = await Promise.all([
      supabase
        .from('partner_verifications')
        .select('*, profiles(email, full_name)')
        .eq('status', 'approved')
        .gte('expires_at', now.toISOString())
        .lte('expires_at', thirtyDaysFromNow.toISOString())
        .eq('renewal_reminder_sent', false)
        .returns<VerificationWithProfile[]>(),
      supabase
        .from('partner_verifications')
        .select('*, profiles(email, full_name)')
        .eq('status', 'approved')
        .gte('expires_at', now.toISOString())
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .returns<VerificationWithProfile[]>(),
      supabase
        .from('partner_verifications')
        .select('*, profiles(email, full_name)')
        .eq('status', 'approved')
        .lt('expires_at', now.toISOString())
        .returns<VerificationWithProfile[]>()
    ]);

    if (error30) throw error30;
    if (error7) throw error7;
    if (errorExpired) throw errorExpired;

    const results = {
      reminders30Day: 0,
      reminders7Day: 0,
      expired: 0,
      errors: [] as string[],
    };

    // Send 30-day reminders
    if (expiring30Days && expiring30Days.length > 0) {
      await Promise.all(expiring30Days.map(async (verification) => {
        try {
          const expiresAt = new Date(verification.expires_at);
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          await resend.emails.send({
            from: "Forward Focus Elevation <noreply@forward-focus-elevation.org>",
            to: [verification.profiles.email],
            subject: "Partner Verification Renewal Reminder - 30 Days",
            html: `
              <h2>Hi ${verification.profiles.full_name || 'Partner'},</h2>
              <p>Your partner verification with <strong>${verification.organization_name}</strong> will expire in ${daysLeft} days.</p>
              <p><strong>Expiration Date:</strong> ${expiresAt.toLocaleDateString()}</p>
              <p>To maintain uninterrupted access to the partner portal and referral system, please renew your verification before the expiration date.</p>
              <p><a href="${supabaseUrl.replace('https://', 'https://app.')}/partners/renew-verification" style="display: inline-block; background: #BB0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Renew Verification Now</a></p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>Forward Focus Elevation Team</p>
            `,
          });

          await supabase
            .from('partner_verifications')
            .update({ renewal_reminder_sent: true })
            .eq('id', verification.id);

          results.reminders30Day++;
        } catch (err) {
          console.error(`Failed to send 30-day reminder to ${verification.profiles.email}:`, err);
          results.errors.push(`30-day reminder failed for ${verification.profiles.email}`);
        }
      }));
    }

    // Send 7-day final reminders
    if (expiring7Days && expiring7Days.length > 0) {
      await Promise.all(expiring7Days.map(async (verification) => {
        try {
          const expiresAt = new Date(verification.expires_at);
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysLeft <= 7 && daysLeft > 0) {
            await resend.emails.send({
              from: "Forward Focus Elevation <noreply@forward-focus-elevation.org>",
              to: [verification.profiles.email],
              subject: "URGENT: Partner Verification Expiring in 7 Days",
              html: `
                <h2>Hi ${verification.profiles.full_name || 'Partner'},</h2>
                <p><strong>⚠️ FINAL REMINDER:</strong> Your partner verification with <strong>${verification.organization_name}</strong> will expire in ${daysLeft} days.</p>
                <p><strong>Expiration Date:</strong> ${expiresAt.toLocaleDateString()}</p>
                <p style="color: #BB0000; font-weight: bold;">After expiration, you will lose access to:</p>
                <ul>
                  <li>Partner dashboard and analytics</li>
                  <li>Referral submission system</li>
                  <li>Resource management tools</li>
                </ul>
                <p><a href="${supabaseUrl.replace('https://', 'https://app.')}/partners/renew-verification" style="display: inline-block; background: #BB0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Renew Verification Immediately</a></p>
                <p>Best regards,<br>Forward Focus Elevation Team</p>
              `,
            });

            results.reminders7Day++;
          }
        } catch (err) {
          console.error(`Failed to send 7-day reminder to ${verification.profiles.email}:`, err);
          results.errors.push(`7-day reminder failed for ${verification.profiles.email}`);
        }
      }));
    }

    // Process expired verifications
    if (expired && expired.length > 0) {
      await Promise.all(expired.map(async (verification) => {
        try {
          // Update status to expired
          await supabase
            .from('partner_verifications')
            .update({ status: 'expired' })
            .eq('id', verification.id);

          // Send expiration notice
          await resend.emails.send({
            from: "Forward Focus Elevation <noreply@forward-focus-elevation.org>",
            to: [verification.profiles.email],
            subject: "Partner Verification Expired - Immediate Action Required",
            html: `
              <h2>Hi ${verification.profiles.full_name || 'Partner'},</h2>
              <p>Your partner verification with <strong>${verification.organization_name}</strong> has expired.</p>
              <p>Your access to the partner portal has been temporarily suspended.</p>
              <p><strong>To restore access:</strong></p>
              <ol>
                <li>Click the renewal button below</li>
                <li>Complete the verification renewal form</li>
                <li>Wait for admin approval (typically 1-2 business days)</li>
              </ol>
              <p><a href="${supabaseUrl.replace('https://', 'https://app.')}/partners/renew-verification" style="display: inline-block; background: #BB0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Renew Verification Now</a></p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>Forward Focus Elevation Team</p>
            `,
          });

          results.expired++;
        } catch (err) {
          console.error(`Failed to process expired verification for ${verification.profiles.email}:`, err);
          results.errors.push(`Expiration processing failed for ${verification.profiles.email}`);
        }
      }));
    }

    console.log("Verification expiration check completed:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in check-verification-expiration:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

