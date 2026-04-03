import { serve } from "@std/http/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { price_id, amount, donor_name } = await req.json();

    if (!price_id && !amount) {
      throw new Error("Price ID or Amount is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Creating donation payment session", { price_id, amount, donor_name });

    // Create Supabase client for potential user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    let customerEmail = undefined;
    let customerId = undefined;

    // Check if user is authenticated (optional for donations)
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        if (data.user?.email) {
          customerEmail = data.user.email;
          
          // Check if customer exists in Stripe
          const customers = await stripe.customers.list({ 
            email: customerEmail, 
            limit: 1 
          });
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        }
      }
    } catch (error) {
      console.log("No authenticated user, proceeding with guest donation");
    }

    // Prepare line items
    const line_items = price_id
      ? [{ price: price_id, quantity: 1 }]
      : [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Custom Donation",
              description: "Thank you for supporting Forward Focus Elevation",
            },
            unit_amount: Math.round(parseFloat(amount) * 100),
          },
          quantity: 1,
        }];

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/support`,
      metadata: {
        donor_name: donor_name || "Anonymous",
        donation_amount: amount || "0",
      },
    });

    console.log("Payment session created successfully", { session_id: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating donation payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
